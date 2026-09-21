// Server-only delivery gateway. Never import this module from a client component.
import {createHash, createHmac, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';

export const MAX_IMAGE = 2 * 1024 * 1024;
const COOKIE='__Host-booth-delivery', DAY=86400000;
export class DeliveryError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new DeliveryError(status,message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const opaque=()=>randomBytes(32).toString('hex');
const secret=env=>env.BOOTH_SESSION_SECRET||'';
const hmac=(value,env)=>createHmac('sha256',secret(env)).update(value).digest('hex');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const limits={email:80,sms:150};
function origin(env){try{const u=new URL(env.BOOTH_PUBLIC_URL);return u.protocol==='https:'&&u.pathname==='/'&&!u.search&&!u.hash&&!u.username?u.origin:'';}catch{return '';}}
export function configuration(env=process.env){
  const common=[];
  if(!env.DELIVERY_DATABASE_URL)common.push('DELIVERY_DATABASE_URL');
  if(secret(env).length<32)common.push('BOOTH_SESSION_SECRET');
  if((env.BOOTH_PAIRING_CODE||'').length<16)common.push('BOOTH_PAIRING_CODE');
  if(!origin(env))common.push('BOOTH_PUBLIC_URL');
  const email=[...common],sms=[...common];
  if(env.BOOTH_EMAIL_ENABLED!=='true')email.push('BOOTH_EMAIL_ENABLED');
  if(!/^re_[A-Za-z0-9_-]{10,}$/.test(env.RESEND_API_KEY||''))email.push('RESEND_API_KEY');
  if(!/^[^<>\r\n]+@[^<>\r\n]+\.[^<>\r\n]+$/.test(env.BOOTH_EMAIL_FROM||''))email.push('BOOTH_EMAIL_FROM');
  if(env.BOOTH_SMS_ENABLED!=='true')sms.push('BOOTH_SMS_ENABLED');
  if(!/^AC[a-fA-F0-9]{32}$/.test(env.TWILIO_ACCOUNT_SID||''))sms.push('TWILIO_ACCOUNT_SID');
  if(!/^[a-fA-F0-9]{32}$/.test(env.TWILIO_AUTH_TOKEN||''))sms.push('TWILIO_AUTH_TOKEN');
  if(!/^MG[a-fA-F0-9]{32}$/.test(env.TWILIO_MESSAGING_SERVICE_SID||'')&&!/^\+[1-9]\d{7,14}$/.test(env.TWILIO_FROM_NUMBER||''))sms.push('TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER');
  return {email:{configured:email.length===0,missing:email},sms:{configured:sms.length===0,missing:sms},pairingConfigured:common.length===0,limits,linkHours:24};
}
export function session(request,env=process.env){
  if(secret(env).length<32)return null;
  const c=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
  if(!c)return null;
  const [body,sig]=c.slice(COOKIE.length+1).split('.');
  if(!body||!same(hmac(body,env),sig))return null;
  try{const s=JSON.parse(Buffer.from(body,'base64url').toString());return uuid.test(s.device)&&s.expires>Date.now()?s:null;}catch{return null;}
}
function requireSession(request,env){const s=session(request,env);if(!s)fail(401,'The owner must authorize this iPad for photo delivery first.');return s;}
function sameOrigin(request,env){if(request.headers.get('origin')!==origin(env))fail(403,'This request must come from the authorized booth.');}
export async function readBody(request,max=3*1024*1024){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Use a JSON request.');
  if(Number(request.headers.get('content-length'))>max)fail(413,'Photo is too large.');
  const reader=request.body?.getReader();if(!reader)fail(400,'Missing request.');
  const chunks=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();fail(413,'Photo is too large.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(400,'Invalid request.');}
}
export function validate(input){
  if(!input||!['email','sms'].includes(input.channel))fail(400,'Choose text or email.');
  if(input.consent!==true)fail(400,'Please confirm this is your address or number and request this one photo.');
  if(!uuid.test(input.requestId||''))fail(400,'Invalid request identifier.');
  let recipient=String(input.recipient||'').trim();
  if(input.channel==='sms'){
    if(/[^\d+ ()-]/.test(recipient))fail(400,'Enter a valid mobile number.');
    recipient=recipient.replace(/[ ()-]/g,'');
    if(/^\d{10}$/.test(recipient))recipient='+1'+recipient;
    if(/^1\d{10}$/.test(recipient))recipient='+'+recipient;
    if(!/^\+[1-9]\d{7,14}$/.test(recipient))fail(400,'Enter a mobile number including country code.');
  }else{
    if(recipient.length>254||!/^([^\s<>@,;:\[\]"\\]+)@([a-z\d.-]+\.[a-z]{2,})$/i.test(recipient))fail(400,'Enter one valid email address.');
    recipient=recipient.toLowerCase();
  }
  if(typeof input.photo!=='string'||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(input.photo))fail(400,'A JPEG photo is required.');
  const bytes=Buffer.from(input.photo.split(',')[1],'base64');
  if(bytes.length<4||bytes.length>MAX_IMAGE||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)fail(400,'The photo must be a valid JPEG under 2 MB.');
  const title=String(input.title||'Your event').replace(/[\r\n\x00-\x1f]/g,' ').trim().slice(0,120)||'Your event';
  const masked=input.channel==='sms'?'••• '+recipient.slice(-4):recipient[0]+'•••@'+recipient.split('@')[1];
  return {channel:input.channel,recipient,masked,bytes,title,test:input.test===true,requestId:input.requestId};
}
// Use provider receipts, never the success of a button click, to label delivery.
export function statusLabel(channel,status){
  if(status==='delivered'||status==='opened'||status==='clicked')return channel==='email'?'Recipient mail server accepted the email. Inbox placement is not confirmed.':'Carrier reported the text delivered. Handset receipt still needs your test.';
  if(['failed','undelivered','bounced','complained','suppressed','canceled'].includes(status))return 'Delivery failed. Check the recipient and ask the attendant before retrying.';
  if(status==='unknown')return 'Delivery outcome is unknown. Do not send again until the owner checks provider logs.';
  if(status==='sent')return 'Sent by the provider; delivery has not yet been confirmed.';
  return 'Accepted or processing; delivery has not yet been confirmed.';
}
export async function sendProvider(job,env,fetcher=fetch){
  const url=origin(env)+'/api/keepsake/'+job.publicToken;
  const prefix=job.test?'[BOOTH TEST] ':'';
  let response;
  if(job.channel==='email'){
    response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':job.id,'User-Agent':'FriendlyBooth/1.0'},body:JSON.stringify({from:env.BOOTH_EMAIL_FROM,to:[job.recipient],subject:prefix+'Your Friendly Photo Booth photo',text:`${prefix}Your photo from ${job.title} is attached.\n\nDownload (expires in 24 hours): ${url}\n\nThis is the one photo you requested, not a marketing subscription.`,attachments:[{filename:job.test?'friendly-booth-TEST.jpg':'friendly-booth-photo.jpg',content:job.bytes.toString('base64') }]}),signal:AbortSignal.timeout(15000)});
  }else{
    const body=new URLSearchParams({To:job.recipient,Body:`${prefix}Friendly Photo Booth: your requested photo ${url} (link expires in 24h). Reply STOP to opt out.`});
    if(env.TWILIO_MESSAGING_SERVICE_SID)body.set('MessagingServiceSid',env.TWILIO_MESSAGING_SERVICE_SID);else body.set('From',env.TWILIO_FROM_NUMBER);
    response=await fetcher(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(15000)});
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const err=new DeliveryError(502,'The sending service rejected this request. Ask the owner to check provider configuration.');err.providerRejected=response.status>=400&&response.status<500;throw err;}
  const id=job.channel==='email'?data.id:data.sid;
  if(typeof id!=='string'||!(job.channel==='email'?uuid.test(id):/^(SM|MM)[0-9a-f]{32}$/i.test(id)))throw new Error('No usable provider receipt');
  return {providerId:id,status:job.channel==='email'?'queued':(data.status||'queued')};
}
export async function providerStatus(job,env,fetcher=fetch){
  const email=job.channel==='email';
  const response=await fetcher(email?`https://api.resend.com/emails/${encodeURIComponent(job.provider_id)}`:`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages/${encodeURIComponent(job.provider_id)}.json`,{headers:email?{Authorization:'Bearer '+env.RESEND_API_KEY,'User-Agent':'FriendlyBooth/1.0'}:{Authorization:'Basic '+Buffer.from(env.TWILIO_ACCOUNT_SID+':'+env.TWILIO_AUTH_TOKEN).toString('base64')},signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!response.ok)throw new Error('Receipt temporarily unavailable');
  const data=await response.json();return String((email?data.last_event:data.status)||job.status).replace(/^email\./,'');
}

let pool,initialized;
async function db(env){
  if(!env.DELIVERY_DATABASE_URL)fail(503,'Photo delivery storage is not configured.');
  if(!pool){const {Pool}=await import('pg');pool=new Pool({connectionString:env.DELIVERY_DATABASE_URL,max:4,connectionTimeoutMillis:5000});pool.on('error',()=>{});}
  if(!initialized)initialized=pool.query(`CREATE SCHEMA IF NOT EXISTS booth_delivery_v1;
    CREATE TABLE IF NOT EXISTS booth_delivery_v1.jobs (id uuid PRIMARY KEY, device uuid NOT NULL, request_id uuid NOT NULL, payload_hash text NOT NULL, channel text NOT NULL, recipient_hash text NOT NULL, masked text NOT NULL, status text NOT NULL, provider_id text, receipt_hash text NOT NULL, public_hash text NOT NULL UNIQUE, bytes bytea, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours', checked_at timestamptz, UNIQUE(device,request_id));
    CREATE INDEX IF NOT EXISTS booth_delivery_jobs_created ON booth_delivery_v1.jobs(created_at);
    CREATE TABLE IF NOT EXISTS booth_delivery_v1.pair_attempts (key text PRIMARY KEY, count integer NOT NULL, started_at timestamptz NOT NULL DEFAULT now());`).catch(e=>{initialized=null;throw e;});
  await initialized;return pool;
}
async function clean(p){await p.query("UPDATE booth_delivery_v1.jobs SET bytes=NULL WHERE expires_at<now() AND bytes IS NOT NULL; DELETE FROM booth_delivery_v1.jobs WHERE created_at<now()-interval '7 days'; DELETE FROM booth_delivery_v1.pair_attempts WHERE started_at<now()-interval '1 day'");}
export async function pair(request,env=process.env){
  sameOrigin(request,env);
  if(!configuration(env).pairingConfigured)fail(503,'Owner setup is incomplete. Sending is disabled.');
  const input=await readBody(request,2048),p=await db(env);
  const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].slice(0,128);
  const {rows}=await p.query(`INSERT INTO booth_delivery_v1.pair_attempts(key,count) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN booth_delivery_v1.pair_attempts.started_at<now()-interval '10 minutes' THEN 1 ELSE booth_delivery_v1.pair_attempts.count+1 END, started_at=CASE WHEN booth_delivery_v1.pair_attempts.started_at<now()-interval '10 minutes' THEN now() ELSE booth_delivery_v1.pair_attempts.started_at END RETURNING count`,[hmac(ip,env)]);
  if(rows[0].count>8)fail(429,'Too many authorization attempts. Wait ten minutes.');
  if(!same(String(input.code||''),env.BOOTH_PAIRING_CODE))fail(401,'Incorrect booth authorization code.');
  const body=Buffer.from(JSON.stringify({device:randomUUID(),expires:Date.now()+12*3600000})).toString('base64url');
  return new Response(JSON.stringify({paired:true,hours:12}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`${COOKIE}=${body}.${hmac(body,env)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`}});
}
function receipt(row,token){return {id:row.id,receiptToken:token,channel:row.channel,recipient:row.masked,status:row.status,message:statusLabel(row.channel,row.status)};}
export async function send(request,env=process.env){
  sameOrigin(request,env);const s=requireSession(request,env);
  const input=validate(await readBody(request));
  if(!configuration(env)[input.channel].configured)fail(503,'This delivery service is not activated. No message was sent.');
  const p=await db(env);await clean(p);
  const payloadHash=hash(input.channel+'\n'+input.recipient+'\n'+input.title+'\n'+input.test+'\n'+hash(input.bytes));
  const recipientHash=hmac(input.channel+':'+input.recipient,env);
  const rt=opaque(),pt=opaque(),id=randomUUID();const client=await p.connect();let row;
  try{
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(742319065)');
    const old=await client.query('SELECT * FROM booth_delivery_v1.jobs WHERE device=$1 AND request_id=$2',[s.device,input.requestId]);
    if(old.rows[0]){
      if(old.rows[0].payload_hash!==payloadHash)fail(409,'This request identifier was already used for a different photo or recipient.');
      // A retried POST never calls Twilio again, even after an ambiguous timeout.
      await client.query('UPDATE booth_delivery_v1.jobs SET receipt_hash=$2 WHERE id=$1',[old.rows[0].id,hash(rt)]);
      await client.query('COMMIT');return receipt(old.rows[0],rt);
    }
    const {rows}=await client.query(`SELECT count(*) FILTER(WHERE channel=$1 AND created_at>now()-interval '24 hours')::int AS daily, count(*) FILTER(WHERE recipient_hash=$2 AND created_at>now()-interval '24 hours')::int AS recipient, count(*) FILTER(WHERE device=$3 AND created_at>now()-interval '1 minute')::int AS recent FROM booth_delivery_v1.jobs`,[input.channel,recipientHash,s.device]);
    if(rows[0].daily>=limits[input.channel]||rows[0].recipient>=5||rows[0].recent>=10)fail(429,'Photo delivery limit reached. Use device sharing or ask the attendant. No message was sent.');
    const result=await client.query(`INSERT INTO booth_delivery_v1.jobs(id,device,request_id,payload_hash,channel,recipient_hash,masked,status,receipt_hash,public_hash,bytes) VALUES($1,$2,$3,$4,$5,$6,$7,'sending',$8,$9,$10) RETURNING *`,[id,s.device,input.requestId,payloadHash,input.channel,recipientHash,input.masked,hash(rt),hash(pt),input.bytes]);
    row=result.rows[0];await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  try{
    const result=await sendProvider({...input,id,publicToken:pt},env);
    await p.query('UPDATE booth_delivery_v1.jobs SET status=$2,provider_id=$3 WHERE id=$1',[id,result.status,result.providerId]);
    row.status=result.status;
  }catch(e){row.status=e.providerRejected?'failed':'unknown';await p.query('UPDATE booth_delivery_v1.jobs SET status=$2 WHERE id=$1',[id,row.status]);}
  return receipt(row,rt);
}
export async function check(request,env=process.env){
  const s=requireSession(request,env),id=new URL(request.url).searchParams.get('id'),token=request.headers.get('x-receipt-token')||'';
  if(!uuid.test(id||'')||!/^[a-f0-9]{64}$/.test(token))fail(404,'Receipt not found.');
  const p=await db(env),{rows}=await p.query('SELECT * FROM booth_delivery_v1.jobs WHERE id=$1 AND device=$2 AND receipt_hash=$3',[id,s.device,hash(token)]);
  const row=rows[0];if(!row)fail(404,'Receipt not found.');
  // Atomic polling claim, at most one provider GET per ten seconds for this receipt.
  const claimed=row.provider_id?await p.query("UPDATE booth_delivery_v1.jobs SET checked_at=now() WHERE id=$1 AND (checked_at IS NULL OR checked_at<now()-interval '10 seconds') RETURNING id",[id]):{rowCount:0};
  let pending=false;
  if(claimed.rowCount){try{row.status=await providerStatus(row,env);await p.query('UPDATE booth_delivery_v1.jobs SET status=$2 WHERE id=$1',[id,row.status]);}catch{pending=true;}}
  return {...receipt(row,token),receiptCheckUnavailable:pending};
}
export async function download(token,env=process.env){
  if(!/^[a-f0-9]{64}$/.test(token))fail(404,'Photo not found.');
  const p=await db(env),{rows}=await p.query('SELECT bytes,expires_at FROM booth_delivery_v1.jobs WHERE public_hash=$1',[hash(token)]);
  if(!rows[0])fail(404,'Photo not found.');
  if(new Date(rows[0].expires_at)<=new Date()||!rows[0].bytes){await p.query('UPDATE booth_delivery_v1.jobs SET bytes=NULL WHERE public_hash=$1',[hash(token)]);fail(410,'This photo link has expired. Ask the event attendant for help.');}
  return new Response(rows[0].bytes,{headers:{'Content-Type':'image/jpeg','Content-Disposition':'attachment; filename="friendly-booth-photo.jpg"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'}});
}
export const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function safe(action){try{return await action();}catch(e){return Response.json({error:e instanceof DeliveryError?e.message:'Service temporarily unavailable. No delivery confirmation is available.'},{status:e instanceof DeliveryError?e.status:503,headers:{'Cache-Control':'no-store'}});}}

// Staff selects a saved booking directly in the booth. Guest requests may read
// only their already-authorized event; no customer contact details are returned.
import {database} from './backup-store.mjs';
import {authorizeBackup,verifyBackupTicket} from './backup-auth.mjs';
import {validStaffSession} from './staff-auth.mjs';
import {publicBoothOrigin,hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError} from './staff-security.mjs';
import {validateBoothHandoff,MAX_BOOTH_SETUP_BYTES} from './booth-handoff.mjs';
import {validateCustomDesign} from './custom-design.mjs';
import {isFprPrintPreset,presetForEventType} from './fpr-print-presets.mjs';

export const STAFF_EVENT_BODY_LIMIT=MAX_BOOTH_SETUP_BYTES;
const eventIdPattern=/^[A-Za-z0-9_-]{3,90}$/;
const revisionPattern=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const clean=(value,max)=>String(value??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max);
const finished=event=>['COMPLETED','ARCHIVED'].includes(event.status);
const columns='"id","name","eventType","date","startTime","endTime","updatedAt","status","theme","maxPrints","printingEnabled","qrSharingEnabled"';
class StaffEventError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new StaffEventError(status,message);};
const date=value=>new Date(value).toISOString();
function eventType(value){
 const type=String(value||'').toLowerCase();
 for(const name of ['wedding','birthday','mitzvah','graduation','corporate'])if(type.includes(name))return name;
 return 'other';
}
function savedDesign(event,experience){
 const design=experience.approvedDesign;
 if(isFprPrintPreset(design)||['ivory','blush','champagne','custom'].includes(design)||
  eventType(event.eventType)==='graduation'&&design==='grad-gala'||
  eventType(event.eventType)==='other'&&design==='quince-royal')return design;
 return presetForEventType(event.eventType);
}
export function staffEventPayload(event){
 const theme=object(event.theme)?event.theme:{},experience=object(theme.boothExperience)?theme.boothExperience:{};
 const design=savedDesign(event,experience),color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(String(value||''))?value.toLowerCase():fallback;
 const palette={champagne:['#32463e','#d4ad73'],rose:['#855665','#e4b4a1'],'black-tie':['#222b37','#cba65c'],coastal:['#29546a','#a2c9d9'],botanical:['#54715b','#c5bd89'],party:['#673b78','#e5b458']}[experience.paletteId]||['#32463e','#d4ad73'];
 const limit=Number(event.maxPrints??108);
 return validateBoothHandoff({
  v:1,id:event.id,rev:date(event.updatedAt),title:clean(event.name,96),date:date(event.date).slice(0,10),
  start:date(event.startTime).slice(11,16),end:date(event.endTime).slice(11,16),type:eventType(event.eventType),
  f:experience.featured==='one'?'one':'four',p:[6,9,12].includes(Number(experience.pauseSeconds))?Number(experience.pauseSeconds):6,
  mode:experience.format==='strip'?'strip':'card',s:Number(experience.strips)===2?2:1,fit:experience.photoFit==='fit'?'fit':'fill',
  a:color(experience.primary,palette[0]),b:color(experience.accent,palette[1]),limit,
  on:event.printingEnabled!==false&&limit>0,qr:event.qrSharingEnabled!==false,design,
  name:clean(experience.nameOnPrint||event.name,65),year:/^\d{4}$/.test(experience.classYear||'')?experience.classYear:'',guest:'approved',
  ...(design==='custom'?{customDesign:validateCustomDesign(experience.customDesign)}:{})
 });
}
export function isSameOriginStaffEventRead(request,env=process.env){
 const origin=publicBoothOrigin(env,request.url);
 if(!origin)return false;
 const supplied=request.headers.get('origin');
 if(supplied!==null)return supplied===origin;
 // Same-origin GET fetches ordinarily omit Origin. Browsers set this protected
 // header themselves; cross-site navigation must not expose the event list.
 return request.headers.get('sec-fetch-site')==='same-origin';
}
async function readBoundedJson(request){
 const type=request.headers.get('content-type')||'';
 if(!/^application\/json(?:\s*;|$)/i.test(type))fail(415,'Send the selected design as JSON.');
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>STAFF_EVENT_BODY_LIMIT))fail(413,'The event design is too large.');
 if(!request.body)fail(400,'Choose an event design before starting.');
 const reader=request.body.getReader(),chunks=[];let length=0;
 try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>STAFF_EVENT_BODY_LIMIT){await reader.cancel().catch(()=>{});fail(413,'The event design is too large.');}chunks.push(part.value);}}
 catch(error){if(error instanceof StaffEventError)throw error;fail(400,'The event design could not be read.');}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{fail(400,'The event design could not be read.');}
}
function checkDesignChange(change){
 if(!object(change)||Object.keys(change).some(key=>!['revision','design','customDesign','nameOnPrint','classYear'].includes(key))||
  typeof change.revision!=='string'||!revisionPattern.test(change.revision)||!Number.isFinite(Date.parse(change.revision))||
  !(isFprPrintPreset(change.design)||change.design==='custom'))fail(400,'Choose one of the five layouts or Custom, then try again.');
 for(const [key,max] of [['nameOnPrint',65],['classYear',4]])if(Object.hasOwn(change,key)&&
  (typeof change[key]!=='string'||change[key].length>max||/[\u0000-\u001f<>]/.test(change[key])))fail(400,'Check the name and class year on the design.');
 if(Object.hasOwn(change,'classYear')&&change.classYear!==''&&!/^\d{4}$/.test(change.classYear))fail(400,'Use four digits for the class year.');
 let customDesign;
 if(Object.hasOwn(change,'customDesign'))try{customDesign=validateCustomDesign(change.customDesign);}catch(error){fail(400,error.message);}
 return {...change,...(customDesign?{customDesign}:{})};
}
async function loadEvent(db,id){
 const {rows}=await db.query('SELECT '+columns+' FROM public."Event" WHERE "id"=$1 LIMIT 1',[id]);
 if(!rows[0])fail(404,'This event no longer exists. Choose another event.');
 if(finished(rows[0]))fail(409,'This event is completed or archived. Choose an open event.');
 return rows[0];
}
export async function updateStaffEvent(db,id,change){
 change=checkDesignChange(change); // Invalid supplied artwork never opens a transaction.
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='10s'");
  const {rows}=await client.query('SELECT '+columns+' FROM public."Event" WHERE "id"=$1 FOR UPDATE',[id]);
  const current=rows[0];if(!current)fail(404,'This event no longer exists. Choose another event.');
  if(finished(current))fail(409,'This event is completed or archived. Choose an open event.');
  if(date(current.updatedAt)!==change.revision)fail(409,'This event changed in another window. Refresh its preview and try again.');
  const theme=object(current.theme)?current.theme:{},experience=object(theme.boothExperience)?theme.boothExperience:{};
  const nextExperience={...experience,approvedDesign:change.design};
  for(const key of ['nameOnPrint','classYear','customDesign'])if(Object.hasOwn(change,key))nextExperience[key]=change[key];
  if(change.design==='custom')try{nextExperience.customDesign=validateCustomDesign(nextExperience.customDesign);}catch(error){fail(400,error.message);}
  const nextTheme={...theme,boothExperience:nextExperience};
  // Validate the complete printable event before any write. Only theme/revision
  // change; status, allowance, original photographs and other metadata are kept.
  staffEventPayload({...current,theme:nextTheme});
  const result=await client.query('UPDATE public."Event" SET "theme"=$2::jsonb,"updatedAt"=GREATEST(date_trunc(\'milliseconds\',clock_timestamp()),"updatedAt"+interval \'1 millisecond\') WHERE "id"=$1 AND "updatedAt"=$3 RETURNING '+columns,[id,JSON.stringify(nextTheme),current.updatedAt]);
  if(!result.rows[0])fail(409,'This event changed in another window. Refresh its preview and try again.');
  const payload=staffEventPayload(result.rows[0]);
  await client.query('COMMIT');return payload;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release();}
}
export async function staffEventsResponse(request,{eventId,staffCookie,env=process.env,getDatabase=database,checkStaff=validStaffSession,checkBackup=verifyBackupTicket,makeBackup=authorizeBackup}={}){
 const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 try{
  const security=staffSecurityStatus(env,request.url);
  if(!security.required||!security.configured)fail(503,staffConfigurationError(security));
  if(request.method==='GET'?!isSameOriginStaffEventRead(request,env):!hasTrustedStaffOrigin(request,env))fail(403,'Open event setup inside this photo booth.');
  if(!['GET','POST'].includes(request.method)||request.method==='POST'&&!eventId)fail(405,'This event action is unavailable.');
  if(eventId!==undefined&&!eventIdPattern.test(eventId))fail(400,'Choose a valid customer event.');
  const staff=await checkStaff(staffCookie,env.BOOTH_STAFF_SESSION_SECRET);
  const authorization=request.headers.get('authorization')||'',match=authorization.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
  let backed=false;
  if(request.method==='GET'&&eventId&&!staff&&match)try{backed=checkBackup(match[1],eventId);}catch{}
  if(!staff&&!backed)fail(401,'Enter the staff PIN to choose an event.');
  const db=await getDatabase();
  if(!eventId){
   const {rows}=await db.query('SELECT "id","name","date","eventType","updatedAt","theme"->\'boothExperience\'->>\'approvedDesign\' AS "design" FROM public."Event" WHERE "status" NOT IN (\'COMPLETED\',\'ARCHIVED\') ORDER BY "date" ASC LIMIT 200');
   return json({events:rows.map(event=>({id:event.id,title:clean(event.name,96),date:date(event.date).slice(0,10),eventType:clean(event.eventType,64),revision:date(event.updatedAt),design:event.design||presetForEventType(event.eventType)}))});
  }
  if(request.method==='POST'){
   if(!staff)fail(401,'Enter the staff PIN to change the event design.');
   const change=await readBoundedJson(request),token=makeBackup(eventId),payload=await updateStaffEvent(db,eventId,change);
   return json({payload,token});
  }
  const event=await loadEvent(db,eventId),payload=staffEventPayload(event);
  return json({payload,...(staff?{token:makeBackup(eventId)}:{})});
 }catch(error){return json({error:error instanceof StaffEventError?error.message:'Event setup is temporarily unavailable. Your saved photos and settings are unchanged.'},error instanceof StaffEventError?error.status:503);}
}

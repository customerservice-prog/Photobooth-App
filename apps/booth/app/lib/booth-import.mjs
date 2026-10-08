import {normalizePrintPackage} from './print-package.mjs';
import {validatePrintLayouts} from './print-layouts.mjs';
import {normalizeEventConfig} from './event-config.mjs';
const match=(value,expression)=>typeof value==='string'&&expression.test(value);
const strictString=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n&&!/[\u0000-\u001f\u007f]/.test(v);
const goodColor=v=>match(v,/^#[\da-f]{6}$/i);
const dateValid=v=>match(v,/^\d{4}-\d\d-\d\d$/)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export const HANDOFF_MAX_BYTES=6500;
export function verifyHandoff(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.v!==1)throw Error('This is not a supported Friendly event setup.');
 if(!match(data.i,/^[a-z0-9_-]{5,90}$/i))throw Error('This event code is not valid.');
 if(!strictString(data.t,90)||!dateValid(data.d))throw Error('Event title or date is invalid.');
 if(data.o!==undefined&&!strictString(data.o,34))throw Error('Event type is invalid.');
 if(![1,4].includes(data.f)||![6,9,12].includes(data.b))throw Error('Photo session settings are invalid.');
 if(!['card','strip'].includes(data.l)||![1,2].includes(data.s)||!['fill','fit'].includes(data.x))throw Error('Print layout settings are invalid.');
 if(!Array.isArray(data.c)||data.c.length!==2||!data.c.every(goodColor))throw Error('Event colors are invalid.');
 if(!['ivory','blush','champagne'].includes(data.g))throw Error('Print design is not supported on this booth.');
 if(!Number.isSafeInteger(data.n)||data.n<0||data.n>10000||typeof data.p!=='boolean'||typeof data.q!=='boolean')throw Error('Print allowance or digital settings are invalid.');
 const allowed=new Set(['v','i','t','d','o','f','b','l','s','x','c','g','n','p','q']);
 if(Object.keys(data).some(key=>!allowed.has(key)))throw Error('The event file contains unexpected information.');
 return {...data,c:[...data.c]};
}
export function decodeHandoff(token){
 if(!match(token,/^[A-Za-z0-9_-]{12,5000}$/))throw Error('The setup link is incomplete or invalid.');
 let text;
 try{
  if(typeof Buffer!=='undefined')text=Buffer.from(token,'base64url').toString('utf8');
  else{
   const encoded=token.replace(/-/g,'+').replace(/_/g,'/');
   const raw=atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'='));
   text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));
  }
  if(new TextEncoder().encode(text).byteLength>HANDOFF_MAX_BYTES)throw Error('The setup is too large.');
  return verifyHandoff(JSON.parse(text));
 }catch(e){if(e.message?.includes('setup is too large')||e.message?.startsWith('This is not')||e.message?.startsWith('The event')||e.message?.startsWith('Event ')||e.message?.startsWith('Photo ')||e.message?.startsWith('Print '))throw e;throw Error('The event setup link could not be read. Ask staff for a new copy.');}
}
export function parseHandoffFile(text){
 if(typeof text!=='string'||text.length>HANDOFF_MAX_BYTES)throw Error('Choose a Friendly setup file under 6 KB.');
 let data;try{data=JSON.parse(text);}catch{throw Error('The selected file is not valid JSON.');}
 return verifyHandoff(data);
}
export function handoffWorkspaceId(id){
 if(!match(id,/^[a-z0-9_-]{5,90}$/i))throw Error('The event ID is invalid.');
 return 'admin-'+id;
}
export function importedEventConfig(raw){
 const data=verifyHandoff(raw);
 const date=new Date(data.d+'T12:00:00.000Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 // 'other' prints the actual confirmed event title without inventing names
 // of wedding partners or a birthday honoree.
 const config={
  eventId:handoffWorkspaceId(data.i),
  adminEventId:data.i,
  importedFromAdmin:true,
  type:'other',
  title:data.t,
  subtitle:data.o||'A lovely celebration',
  date,
  details:{eventName:data.t,primaryColor:data.c[0],secondaryColor:data.c[1]},
  setupComplete:true,
  defaultTemplate:data.g,
  defaultPhotoExperience:data.f===1?'one':'four',
  photoPauseSeconds:data.b,
  photoFit:data.x,
  printLayouts:validatePrintLayouts({cardEnabled:true,stripEnabled:true,defaultLayout:data.l==='strip'?'photo_strip':'card',stripMode:data.s===2?'double':'single',useEventColors:true}),
  printPackage:normalizePrintPackage({includedPrints:data.n,addOnPrints:0,copiesPerSession:1,shotsPerSession:4,printingEnabled:data.p,digitalEnabled:true}),
  qrSharingEnabled:data.q
 };
 return normalizeEventConfig(config);
}
export function applyHandoff(storage,raw){
 const data=verifyHandoff(raw),id=handoffWorkspaceId(data.i);
 const key='friendly-booth-import:'+id+':config',previousKey='friendly-booth-import:'+id+':previous';
 const next=importedEventConfig(data);
 // The only writes are the imported event config + optional previous backup:
 // no other event, photo, print-usage key or IndexedDB archive is touched.
 const previous=storage.getItem(key);
 if(previous!==null)storage.setItem(previousKey,previous);
 try{storage.setItem(key,JSON.stringify(next));}catch(error){throw Error('There is not enough storage to load this event. No photo or print counts were changed.');}
 return {id,config:next,updated:previous!==null};
}

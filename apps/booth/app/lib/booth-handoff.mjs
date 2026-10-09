// Cross-device handoff contract v1. Only non-sensitive public event display and
// booth print preferences travel in the URL fragment. No contact details, venue
// address, private staff notes, photo bytes, passwords or account identifiers.
import {workspace,usage,ownPrintUsage} from './event-workspace.mjs';
import {normalizePrintPackage} from './print-package.mjs';
import {normalizePrintLayouts} from './print-layouts.mjs';
import {validateCustomDesign} from './custom-design.mjs';
export const ADMIN_SETUP_ORIGIN='https://photobooth-app-production.up.railway.app';
export const MAX_BOOTH_SETUP_BYTES=900000;
const idRe=/^[A-Za-z0-9_-]{3,90}$/;
const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hex=/^#[0-9a-f]{6}$/i;
const dateRe=/^\d{4}-\d\d-\d\d$/;
const types=new Set(['wedding','birthday','mitzvah','graduation','corporate','other']);
const finiteInt=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
const readableDate=day=>new Date(day+'T12:00:00.000Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const ticketRe=/^[A-Za-z0-9_-]{1,400}\.[A-Za-z0-9_-]{43}$/;
function setupReference(payload){
 if(!payload||Array.isArray(payload)||typeof payload!=='object'||payload.v!==2||typeof payload.id!=='string'||!idRe.test(payload.id)||typeof payload.sync!=='string'||payload.sync.length>512||!ticketRe.test(payload.sync)||Object.keys(payload).some(key=>!['v','id','sync'].includes(key)))throw new Error('This protected event link is invalid. Open a fresh link from the staff dashboard.');
 return payload;
}
export function decodeBoothHandoff(fragment){
 const token=String(fragment||'').replace(/^#/,'');
 if(!token||token.length>1500||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('This event link is missing or invalid. Open a fresh link from the staff dashboard.');
 let payload;
 try{
  const bytes=atob(token.replace(/-/g,'+').replace(/_/g,'/'));
  payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes,c=>c.charCodeAt(0))));
 }catch{throw new Error('This event link could not be read. Copy it again from Staff dashboard.');}
 if(payload?.v===2)return setupReference(payload);
 if(payload?.design==='custom')throw new Error('Custom artwork needs a protected event setup link from the staff dashboard.');
 return validateBoothHandoff(payload);
}
export function validateBoothHandoff(payload){
 if(!payload||Array.isArray(payload)||typeof payload!=='object'||payload.v!==1||
  typeof payload.id!=='string'||!idRe.test(payload.id)||typeof payload.title!=='string'||!payload.title.trim()||payload.title.length>96||
  /[\u0000-\u001f<>]/.test(payload.title)||typeof payload.date!=='string'||!dateRe.test(payload.date)||!Number.isFinite(Date.parse(payload.date+'T12:00:00Z'))||
  new Date(payload.date+'T12:00:00Z').toISOString().slice(0,10)!==payload.date||
  typeof payload.start!=='string'||typeof payload.end!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.end)||
  typeof payload.rev!=='string'||!iso.test(payload.rev)||!Number.isFinite(Date.parse(payload.rev))||
  !types.has(payload.type)||!['one','four'].includes(payload.f)||
  ![6,9,12].includes(payload.p)||!['card','strip'].includes(payload.mode)||
  ![1,2].includes(payload.s)||!['fill','fit'].includes(payload.fit)||typeof payload.a!=='string'||typeof payload.b!=='string'||!hex.test(payload.a)||!hex.test(payload.b)||
  !finiteInt(payload.limit,10000)||typeof payload.on!=='boolean'||typeof payload.qr!=='boolean'||
  !(['ivory','blush','champagne','custom'].includes(payload.design)||(payload.type==='graduation'&&payload.design==='grad-gala')||(payload.type==='other'&&payload.design==='quince-royal'))||
  (payload.name!==undefined&&(typeof payload.name!=='string'||payload.name.length>65||/[\u0000-\u001f<>]/.test(payload.name)))||
  (payload.year!==undefined&&(typeof payload.year!=='string'||(payload.year!==''&&!/^\d{4}$/.test(payload.year))))||
  (payload.guest!==undefined&&payload.guest!=='approved')||
  (payload.sync!==undefined&&(typeof payload.sync!=='string'||payload.sync.length>512||!ticketRe.test(payload.sync))))
  throw new Error('This is not a valid Friendly Photo Booth event link. Ask staff for a new one.');
 const checked=payload.design==='custom'?{...payload,customDesign:validateCustomDesign(payload.customDesign)}:payload;
 if(new TextEncoder().encode(JSON.stringify(checked)).byteLength>MAX_BOOTH_SETUP_BYTES)throw new Error('This event setup is too large. Reduce the custom artwork size and save again.');
 return checked;
}
export async function fetchBoothSetup(reference,{fetch:request=globalThis.fetch,signal}={}){
 setupReference(reference);
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,15000);
 try{
  let response;
  try{response=await request(ADMIN_SETUP_ORIGIN+'/api/booth/sync/'+encodeURIComponent(reference.id),{method:'GET',headers:{Authorization:'Bearer '+reference.sync},credentials:'omit',cache:'no-store',signal:controller.signal});}
  catch(error){if(signal?.aborted)throw error;throw new Error(controller.signal.aborted?'The event download took too long. Check the iPad internet connection and open the setup link again.':'The event design could not be downloaded. Connect this iPad to the internet and open the setup link again.');}
  if(!response.ok)throw new Error(response.status===401?'This event setup link has expired. Open a fresh link from the staff dashboard.':'The protected event setup could not be downloaded. Check the iPad internet connection and try again.');
  if(Number(response.headers.get('content-length'))>MAX_BOOTH_SETUP_BYTES)throw new Error('The custom event setup is too large.');
  if(!response.body)throw new Error('The event setup response was empty.');
  const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,body='';
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>MAX_BOOTH_SETUP_BYTES)throw new Error('The custom event setup is too large.');body+=decoder.decode(chunk.value,{stream:true});}body+=decoder.decode();}catch(error){await reader.cancel().catch(()=>{});throw error;}
  let payload;try{payload=JSON.parse(body);}catch{throw new Error('The downloaded event setup could not be read. Ask staff for a fresh link.');}
  const checked=validateBoothHandoff(payload);
  if(checked.id!==reference.id)throw new Error('This setup belongs to a different event. Nothing was changed.');
  return {...checked,sync:reference.sync};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function resolveBoothHandoff(fragment,options={}){
 const payload=decodeBoothHandoff(fragment);
 return payload.v===2?fetchBoothSetup(payload,options):payload;
}
export function configFromBoothHandoff(payload,existing={}){
 const title=payload.title.trim();
 const old=existing&&typeof existing==='object'?existing:{};
 const displayName=String(payload.name||title).trim().slice(0,65)||title;
 const details={...(old.details&&typeof old.details==='object'?old.details:{}),
  eventName:displayName,primaryColor:payload.a.toLowerCase(),secondaryColor:payload.b.toLowerCase(),
  ...(payload.type==='graduation'?{graduate:displayName,classYear:payload.year||''}:{honoree:displayName})};
 const previousLayouts=normalizePrintLayouts(old.printLayouts);
 const defaultLayout=payload.mode==='strip'?'photo_strip':'card';
 const previousPackage=normalizePrintPackage(old.printPackage);
 return {
  ...old,title,subtitle:'Made for your celebration',type:payload.type,
  date:readableDate(payload.date),eventId:payload.id,
  schedule:{date:payload.date,start:payload.start,end:payload.end,timeZone:'America/New_York'},
  details,photoFit:payload.fit,photoPauseSeconds:payload.p,
  defaultPhotoExperience:payload.f,defaultTemplate:payload.design,
  guestMode:'approved',approvedPrintName:displayName,
  customDesign:payload.design==='custom'?validateCustomDesign(payload.customDesign):undefined,
  printLayouts:{...previousLayouts,cardEnabled:true,stripEnabled:true,
   defaultLayout,stripMode:payload.s===2?'double':'single'},
  printPackage:{...previousPackage,includedPrints:payload.limit,addOnPrints:0,
   shotsPerSession:4,copiesPerSession:1,printingEnabled:payload.on&&payload.limit>0},
  setupComplete:true,qrSharingEnabled:payload.qr,
  adminHandoff:{version:1,revision:payload.rev,transferredAt:new Date().toISOString(),syncTicket:typeof payload.sync==='string'?payload.sync:(old.adminHandoff?.syncTicket||null)}
 };
}
export function applyBoothHandoff(storage,payload){
 // This event owns its own config, print counter, recent photos and IndexedDB
 // scope. No other event keys are modified. An update never resets prints used.
 payload=validateBoothHandoff(payload);
 const scope=workspace('?booth_event='+encodeURIComponent(payload.id));
 if(!scope.imported)throw new Error('The event scope could not be created.');
 const previousRaw=storage.getItem(scope.config);
 let previous=null;
 if(previousRaw!==null){
  try{previous=JSON.parse(previousRaw);}catch{throw new Error('Existing settings are unreadable. Restore the local backup before importing.');}
  if(!previous||Array.isArray(previous)||typeof previous!=='object')throw new Error('Existing event settings are unreadable; nothing was changed.');
 }
 const priorRevision=previous?.adminHandoff?.revision;
 if(priorRevision&&Date.parse(priorRevision)>Date.parse(payload.rev))
  throw new Error('This is an older setup link. Open a new link from the staff dashboard.');
 const used=usage(storage,scope); // Validate the counter BEFORE writing the new config.
 const next=configFromBoothHandoff(payload,previous||{});
 const json=JSON.stringify(next);
 if(new TextEncoder().encode(json).byteLength>MAX_BOOTH_SETUP_BYTES)throw new Error('Event settings are too large for this device.');
 // Materialize and validate every value before touching this event's keys.
 // Restore completed writes if a large artwork hits the device storage quota.
 const changes=[];
 if(storage.getItem(scope.usage)===null)changes.push({key:scope.usage,value:String(ownPrintUsage(storage,scope)),before:null});
 if(previousRaw!==null)changes.push({key:scope.previous,value:previousRaw,before:storage.getItem(scope.previous)});
 changes.push({key:scope.config,value:json,before:previousRaw});
 const written=[];
 try{for(const change of changes){storage.setItem(change.key,change.value);written.push(change);}}
 catch(error){
  let restored=true;
  // Reclaim newly allocated keys before restoring a potentially larger backup.
  for(const change of written.filter(change=>change.before===null)){try{storage.removeItem(change.key);}catch{restored=false;}}
  for(const change of written.reverse().filter(change=>change.before!==null)){try{storage.setItem(change.key,change.before);}catch{restored=false;}}
  throw new Error(restored?'The event settings could not be saved on this iPad. Existing settings and photos were kept. Free storage space or use smaller custom artwork, then try again.':'The iPad storage could not restore the event settings. Keep this event’s local backup and ask staff for help before taking photos.');
 }
 return {scope,config:next,printsUsed:used,updated:Boolean(previous)};
}

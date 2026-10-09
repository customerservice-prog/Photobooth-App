import {applyBoothHandoff,validateBoothHandoff,MAX_BOOTH_SETUP_BYTES} from './booth-handoff.mjs';
import {workspace} from './event-workspace.mjs';
import {saveBackupToken,tokenKey} from './backup-sync.mjs';
import {assignActiveEvent,ACTIVE_EVENT_KEY} from './active-event.mjs';

const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{3,90}$/.test(id);
const validToken=token=>typeof token==='string'&&/^[A-Za-z0-9_-]{1,400}\.[A-Za-z0-9_-]{43}$/.test(token);
const MAX_RESPONSE_BYTES=MAX_BOOTH_SETUP_BYTES+2048;

export class StaffEventError extends Error{
 constructor(message,status=0){super(message);this.name='StaffEventError';this.status=status;}
}

async function jsonResponse(response){
 if(Number(response.headers?.get('content-length'))>MAX_RESPONSE_BYTES)throw new StaffEventError('The event artwork is too large. Use smaller images.');
 let body='';
 if(response.body?.getReader){
  const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let size=0;
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>MAX_RESPONSE_BYTES)throw new StaffEventError('The event artwork is too large. Use smaller images.');body+=decoder.decode(chunk.value,{stream:true});}body+=decoder.decode();}
  catch(error){await reader.cancel().catch(()=>{});throw error;}
 }else{body=await response.text();if(new TextEncoder().encode(body).byteLength>MAX_RESPONSE_BYTES)throw new StaffEventError('The event artwork is too large. Use smaller images.');}
 let data;try{data=JSON.parse(body);}catch{throw new StaffEventError('The event could not be read. Please try again.',response.status);}
 if(!response.ok)throw new StaffEventError(typeof data?.error==='string'?data.error:response.status===401?'Enter the staff PIN to continue.':response.status===409?'This event changed. Refresh it before choosing a layout.':'The event could not be saved. Please try again.',response.status);
 return data;
}

async function request(path,{fetch:send=globalThis.fetch,signal,...options}={}){
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,15000);
 try{return await jsonResponse(await send(path,{cache:'no-store',credentials:'same-origin',redirect:'error',...options,signal:controller.signal}));}
 catch(error){if(error instanceof StaffEventError||signal?.aborted)throw error;throw new StaffEventError(controller.signal.aborted?'The event took too long to open. Check Wi-Fi and try again.':'Connect to Wi-Fi to choose an event. Your saved photos are still on this iPad.');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}

function checkedEvent(data,id){
 const payload=validateBoothHandoff(data?.payload);
 if(payload.id!==id)throw new StaffEventError('This response belongs to a different event. Nothing was changed.');
 if(data.token!==undefined&&!validToken(data.token))throw new StaffEventError('Photo saving could not be authorized. Please try again.');
 return {payload,...(data.token!==undefined?{token:data.token}:{})};
}

export async function fetchStaffEvents(options={}){
 const data=await request('/api/staff/events',options);
 if(!Array.isArray(data?.events)||data.events.some(event=>!validId(event?.id)||typeof event.title!=='string'||typeof event.date!=='string'))throw new StaffEventError('The event list could not be read. Please refresh.');
 return data.events;
}

export async function fetchStaffEvent(id,token,options={}){
 if(!validId(id))throw new StaffEventError('Choose an event.');
 if(token!==undefined&&!validToken(token))throw new StaffEventError('Photo saving could not be authorized. Enter the staff PIN again.');
 return checkedEvent(await request('/api/staff/events/'+encodeURIComponent(id),{...options,method:'GET',...(token?{headers:{Authorization:'Bearer '+token}}:{})}),id);
}

export async function saveStaffEvent(id,changes,options={}){
 if(!validId(id))throw new StaffEventError('Choose an event.');
 return checkedEvent(await request('/api/staff/events/'+encodeURIComponent(id),{...options,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes)}),id);
}

export function applyStaffEvent(storage,{payload,token},{activate=true}={}){
 payload=validateBoothHandoff(payload);
 const scope=workspace('?booth_event='+encodeURIComponent(payload.id));
 const ticket=token===undefined?storage.getItem(tokenKey(payload.id)):token;
 if(!validToken(ticket))throw new StaffEventError('Photo saving is not ready. Connect to Wi-Fi and start the event again.');
 // Include every key written by the existing handoff so a quota failure cannot
 // leave the newly selected event active with a missing backup authorization.
 const keys=[scope.config,scope.previous,scope.usage,tokenKey(payload.id),...(activate?[ACTIVE_EVENT_KEY]:[])];
 const before=new Map(keys.map(key=>[key,storage.getItem(key)]));
 try{
  const result=applyBoothHandoff(storage,payload);
  const config={...result.config,adminHandoff:{...result.config.adminHandoff,source:'staff',syncTicket:null}};
  storage.setItem(scope.config,JSON.stringify(config));
  saveBackupToken(storage,payload.id,ticket);
  if(activate)assignActiveEvent(storage,payload.id);
  return {...result,config};
 }catch(error){
  let restored=true;
  for(const [key,value] of before)if(value===null)try{storage.removeItem(key);}catch{restored=false;}
  for(const [key,value] of before)if(value!==null)try{storage.setItem(key,value);}catch{restored=false;}
  if(!restored)throw new StaffEventError('The iPad could not restore its settings. Keep your local photo backup and ask the owner for help.');
  throw error;
 }
}

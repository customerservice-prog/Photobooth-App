import {activeEventDestination} from './active-event.mjs';
import {workspace} from './event-workspace.mjs';

const origin='https://navigation.invalid';
const staffPages=new Set(['/setup','/event-prep','/print-test','/delivery-check','/test','/designs','/oct10-demo']);
const returnPages=new Set(['/','/launch','/staff/start','/setup','/event-prep','/help','/privacy','/print-test','/delivery-check','/designs','/test']);
function internal(value,allowed){
 if(typeof value!=='string'||value.length>2000||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f]/.test(value))return '';
 try{
  const url=new URL(value,origin);
  if(url.origin!==origin||!allowed.has(url.pathname)||url.hash)return '';
  url.searchParams.delete('next');
  return url.pathname+url.search;
 }catch{return '';}
}
export function safeReturnDestination(value){return internal(value,returnPages);}
export function safeSignedOutReturnDestination(value){
 const safe=safeReturnDestination(value);
 return ['/','/launch','/staff/start'].includes(safe.split('?')[0])?safe:'/launch';
}
export function safeStaffDestination(value){return internal(value,staffPages)||'/staff/start';}
export function eventHome(scope){return scope.id==='legacy'?'/?local=1':scope.home;}
export function readReturnDestination(search='',storage){
 const params=new URLSearchParams(search);
 const explicit=safeReturnDestination(params.get('returnTo'));
 if(explicit)return explicit;
 if(params.get('local')==='1')return '/?local=1';
 if(params.has('booth_event')||params.get('event')==='oct10-2026'){
  try{return workspace(search).home;}catch{}
 }
 return (storage&&activeEventDestination(storage))||'/launch';
}
export function withReturnTo(path,returnTo){
 const url=new URL(path,origin),safe=safeReturnDestination(returnTo);
 if(url.origin!==origin)throw new Error('Staff navigation must stay in the booth');
 if(safe)url.searchParams.set('returnTo',safe);
 return url.pathname+url.search+url.hash;
}
export function returnLabel(destination){
 const path=String(destination).split('?')[0];
 return path==='/staff/start'||path==='/setup'||path==='/event-prep'?'Back to event setup':path==='/launch'?'Back to booth start':'Back to your event';
}

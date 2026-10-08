// Cross-device handoff contract v1. Only non-sensitive public event display and
// booth print preferences travel in the URL fragment. No contact details, venue
// address, private staff notes, photo bytes, passwords or account identifiers.
import {workspace,usage} from './event-workspace.mjs';
import {normalizePrintPackage} from './print-package.mjs';
import {normalizePrintLayouts} from './print-layouts.mjs';
const idRe=/^[A-Za-z0-9_-]{3,90}$/;
const iso=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const hex=/^#[0-9a-f]{6}$/i;
const dateRe=/^\d{4}-\d\d-\d\d$/;
const types=new Set(['wedding','birthday','mitzvah','graduation','corporate','other']);
const finiteInt=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
const readableDate=day=>new Date(day+'T12:00:00.000Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
export function decodeBoothHandoff(fragment){
 const token=String(fragment||'').replace(/^#/,'');
 if(!token||token.length>1500||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('This event link is missing or invalid. Open a fresh link from the staff dashboard.');
 let payload;
 try{
  const bytes=atob(token.replace(/-/g,'+').replace(/_/g,'/'));
  payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes,c=>c.charCodeAt(0))));
 }catch{throw new Error('This event link could not be read. Copy it again from Staff dashboard.');}
 if(!payload||Array.isArray(payload)||typeof payload!=='object'||payload.v!==1||
  !idRe.test(payload.id)||typeof payload.title!=='string'||!payload.title.trim()||payload.title.length>96||
  /[\u0000-\u001f<>]/.test(payload.title)||!dateRe.test(payload.date)||!Number.isFinite(Date.parse(payload.date+'T12:00:00Z'))||
  new Date(payload.date+'T12:00:00Z').toISOString().slice(0,10)!==payload.date||
  !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(payload.start)||!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(payload.end)||
  typeof payload.rev!=='string'||!iso.test(payload.rev)||!Number.isFinite(Date.parse(payload.rev))||
  !types.has(payload.type)||!['one','four'].includes(payload.f)||
  ![6,9,12].includes(payload.p)||!['card','strip'].includes(payload.mode)||
  ![1,2].includes(payload.s)||!['fill','fit'].includes(payload.fit)||!hex.test(payload.a)||!hex.test(payload.b)||
  !finiteInt(payload.limit,10000)||typeof payload.on!=='boolean'||typeof payload.qr!=='boolean'||
  !['ivory','blush','champagne'].includes(payload.design))
  throw new Error('This is not a valid Friendly Photo Booth event link. Ask staff for a new one.');
 return payload;
}
export function configFromBoothHandoff(payload,existing={}){
 const title=payload.title.trim();
 const old=existing&&typeof existing==='object'?existing:{};
 const details={...(old.details&&typeof old.details==='object'?old.details:{}),
  eventName:title,primaryColor:payload.a.toLowerCase(),secondaryColor:payload.b.toLowerCase()};
 const previousLayouts=normalizePrintLayouts(old.printLayouts);
 const defaultLayout=payload.mode==='strip'?'photo_strip':'card';
 const previousPackage=normalizePrintPackage(old.printPackage);
 return {
  ...old,title,subtitle:'Made for your celebration',type:payload.type,
  date:readableDate(payload.date),eventId:payload.id,
  schedule:{date:payload.date,start:payload.start,end:payload.end,timeZone:'America/New_York'},
  details,photoFit:payload.fit,photoPauseSeconds:payload.p,
  defaultPhotoExperience:payload.f,defaultTemplate:payload.design,
  printLayouts:{...previousLayouts,cardEnabled:true,stripEnabled:true,
   defaultLayout,stripMode:payload.s===2?'double':'single'},
  printPackage:{...previousPackage,includedPrints:payload.limit,addOnPrints:0,
   shotsPerSession:4,copiesPerSession:1,printingEnabled:payload.on&&payload.limit>0},
  setupComplete:true,
  adminHandoff:{version:1,revision:payload.rev,transferredAt:new Date().toISOString()}
 };
}
export function applyBoothHandoff(storage,payload){
 // This event owns its own config, print counter, recent photos and IndexedDB
 // scope. No other event keys are modified. An update never resets prints used.
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
 if(json.length>20000)throw new Error('Event settings are too large for this device.');
 // Preserve the previous configuration for recovery. Do not touch capture data.
 if(previousRaw!==null)storage.setItem(scope.previous,previousRaw);
 storage.setItem(scope.config,json);
 if(storage.getItem(scope.usage)===null)storage.setItem(scope.usage,String(used));
 return {scope,config:next,printsUsed:used,updated:Boolean(previous)};
}

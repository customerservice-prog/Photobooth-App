import {normalizePrintPackage} from './print-package.mjs';

export const EVENT_ID='oct10-2026';
export const ADMIN_EVENT_URL='https://photobooth-app-production.up.railway.app/events/efcbaffc-893f-4361-983b-79a38e7d111a';
export const LEGACY_KEYS=Object.freeze({config:'friendly-booth-event-v1',photos:'friendly-booth-photos-v1',usage:'friendly-booth-print-usage-v1'});
const root='friendly-booth-oct10-2026-v2';
export const EVENT_KEYS=Object.freeze({config:root+'-config',liveUsage:root+'-live-usage',demoUsage:root+'-demo-usage',previous:root+'-previous'});
const text=(v,n=100)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const color=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?v:undefined;
export const PREP_CHECKS=Object.freeze({details:'Customer details and event address confirmed in the booking',design:'Customer approved the printed name and colors',camera:'Photo session tested on the actual iPad',printer:'A real Canon test print checked for paper, color and cropping',digital:'Digital copy saved and opened on another device'});

export function octoberPreset(){
  return {eventId:EVENT_ID,type:'other',title:'October 10 Photo Booth Party',subtitle:'Photo Booth Preview',date:'October 10, 2026',setupComplete:true,defaultTemplate:'champagne',photoFit:'fit',
    details:{eventName:'October 10 Photo Booth Party',honoree:'',subtitle:'',primaryColor:'#24352f',secondaryColor:'#d8c49b'},
    schedule:{date:'2026-10-10',start:'16:00',end:'20:00',timeZone:'America/New_York'},
    preparation:{colorsConfirmed:false,checks:{}},
    printPackage:normalizePrintPackage({includedPrints:108,addOnPrints:108,shotsPerSession:4})};
}
export function workspace(search=''){
  const p=new URLSearchParams(search);
  if(p.get('event')!==EVENT_ID)return {...LEGACY_KEYS,id:'legacy',demo:false,managed:false,home:'/',setup:'/setup',archive:'legacy'};
  const demo=p.get('demo')==='1';
  const query='?event='+EVENT_ID+(demo?'&demo=1':'');
  return {id:EVENT_ID,demo,managed:true,config:EVENT_KEYS.config,usage:demo?EVENT_KEYS.demoUsage:EVENT_KEYS.liveUsage,photos:root+(demo?'-demo-recent':'-live-recent'),archive:EVENT_ID+(demo?':demo':':live'),home:'/'+query,setup:'/event-prep'};
}
export const demoWorkspace=()=>workspace('?event='+EVENT_ID+'&demo=1');
export const liveWorkspace=()=>workspace('?event='+EVENT_ID);
function parsed(storage,key){const raw=storage.getItem(key);if(raw===null)return null;const v=JSON.parse(raw);if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Saved event settings are not valid. Restore your settings backup; no photos have been removed.');return v;}
function isLegacyOctober(c){return c?.date==='October 10, 2026'&&c?.title==='October 10 Photo Booth Party';}
export function readEventDraft(storage){
  const saved=parsed(storage,EVENT_KEYS.config);if(saved)return {...saved,eventId:EVENT_ID};
  const legacy=parsed(storage,LEGACY_KEYS.config),preset=octoberPreset();
  // Only migrate the explicitly known old October preset; never another event.
  return isLegacyOctober(legacy)?{...preset,...legacy,eventId:EVENT_ID,details:{...preset.details,...legacy.details},schedule:preset.schedule,preparation:preset.preparation}:preset;
}
export function usage(storage,scope){
  let raw=storage.getItem(scope.usage);
  if(raw===null&&scope.managed&&!scope.demo){const legacy=parsed(storage,LEGACY_KEYS.config);if(isLegacyOctober(legacy))raw=storage.getItem(LEGACY_KEYS.usage);}
  if(raw===null)return 0;
  if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new Error('The print counter needs staff review. It was not reset.');
  return Number(raw);
}
export function saveEventDraft(storage,cfg){
  const old=storage.getItem(EVENT_KEYS.config);
  if(old!==null)storage.setItem(EVENT_KEYS.previous,old);
  // Preserve existing legacy usage conservatively before a settings edit.
  if(storage.getItem(EVENT_KEYS.liveUsage)===null)storage.setItem(EVENT_KEYS.liveUsage,String(usage(storage,liveWorkspace())));
  const next={...cfg,eventId:EVENT_ID};
  delete next.runtime;delete next.mode;delete next.captureMode;
  storage.setItem(EVENT_KEYS.config,JSON.stringify(next));return next;
}
export function validatePreparation(draft){
  const base=octoberPreset(),s=draft.schedule||base.schedule;
  if(!text(draft.title))throw new Error('Add an event title. The temporary October title is fine for now.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||new Date(s.date+'T12:00:00Z').toISOString().slice(0,10)!==s.date)throw new Error('Choose a valid event date.');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)||s.end<=s.start)throw new Error('The end time must be after the start time.');
  const pp=normalizePrintPackage(draft.printPackage);
  if(![0,54,108].includes(pp.addOnPrints))throw new Error('Choose one of the listed print packages.');
  const date=new Date(s.date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'});
  const checks={};for(const k of Object.keys(PREP_CHECKS))checks[k]=draft.preparation?.checks?.[k]===true;
  return {eventId:EVENT_ID,type:'other',title:text(draft.title),subtitle:text(draft.subtitle),date,setupComplete:true,photoFit:'fit',defaultTemplate:['ivory','blush','champagne'].includes(draft.defaultTemplate)?draft.defaultTemplate:'champagne',
    details:{eventName:text(draft.title),honoree:text(draft.details?.honoree,80),subtitle:text(draft.details?.subtitle,80),primaryColor:color(draft.details?.primaryColor)||base.details.primaryColor,secondaryColor:color(draft.details?.secondaryColor)||base.details.secondaryColor},
    schedule:{date:s.date,start:s.start,end:s.end,timeZone:'America/New_York'},preparation:{colorsConfirmed:draft.preparation?.colorsConfirmed===true,checks},printPackage:{...pp,includedPrints:108,copiesPerSession:1,printingEnabled:true,digitalEnabled:true}};
}
export function readyForEvent(cfg){return cfg.preparation?.colorsConfirmed===true&&Object.keys(PREP_CHECKS).every(k=>cfg.preparation?.checks?.[k]===true);}
export function portableSettings(cfg){return JSON.stringify({format:'friendly-booth-event-settings',version:1,eventId:EVENT_ID,config:validatePreparation(cfg)},null,2);}
export function importSettings(raw){
  if(typeof raw!=='string'||raw.length>50000)throw new Error('Choose a Friendly event-settings JSON file under 50 KB.');
  const value=JSON.parse(raw);if(value.format!=='friendly-booth-event-settings'||value.version!==1||value.eventId!==EVENT_ID)throw new Error('This file is not an October event-settings backup.');
  // New device: physical checks must be repeated. Usage and photos are never imported/reset.
  return validatePreparation({...value.config,preparation:{...value.config?.preparation,checks:{}}});
}
export function scheduleLabel(cfg){
  const s=cfg.schedule;if(!s)return '';
  const fmt=t=>{const [h,m]=t.split(':').map(Number);return (h%12||12)+(m?':'+String(m).padStart(2,'0'):'')+' '+(h>=12?'PM':'AM');};
  return fmt(s.start)+'–'+fmt(s.end)+' · New York time';
}

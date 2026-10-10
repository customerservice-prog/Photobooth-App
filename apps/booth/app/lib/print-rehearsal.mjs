import {workspace} from './event-workspace.mjs';
import {readReturnDestination,safeReturnDestination} from './staff-navigation.mjs';
import {normalizeEventConfig,eventMonogram} from './event-config.mjs';
import {guestEventConfig} from './guest-design.mjs';
import {presetById} from './fpr-print-presets.mjs';
import {activeEventDestination} from './active-event.mjs';

function scopedSearch(search){
 const params=new URLSearchParams(search);
 return params.has('booth_event')||params.get('event')==='oct10-2026'||params.get('local')==='1';
}

// Read the same event as the guest screen without creating a draft, changing the
// active booking, or touching that event's photos and print allowance.
export function readPrintRehearsal(storage,search=''){
 let eventSearch=search;
 if(!scopedSearch(eventSearch)){
  let back=safeReturnDestination(new URLSearchParams(search).get('returnTo'))||readReturnDestination(search,storage);
  for(let depth=0;depth<4&&back;depth++){
   eventSearch=new URL(back,'https://navigation.invalid').search;
   if(scopedSearch(eventSearch))break;
   back=safeReturnDestination(new URLSearchParams(eventSearch).get('returnTo'));
  }
  if(!scopedSearch(eventSearch))eventSearch=new URL(activeEventDestination(storage)||'/?local=1','https://navigation.invalid').search;
 }
 const scope=workspace(eventSearch),raw=storage.getItem(scope.config);
 if(raw===null)return {scope,cfg:null};
 let saved;
 try{saved=JSON.parse(raw);}catch{throw new Error('The saved event could not be read. Open event setup before testing the printer.');}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))throw new Error('The saved event settings need staff review before printing.');
 if(scope.imported&&saved.eventId!==scope.id)throw new Error('These settings belong to a different event. Choose the correct event before testing.');
 if(!String(saved.title||'').trim()||!saved.defaultTemplate)throw new Error('Choose and save this event’s design before testing the printer.');
 return {scope,cfg:guestEventConfig(normalizeEventConfig(saved))};
}

export function rehearsalSampleFamily(cfg){
 const preset=presetById(cfg.defaultTemplate);
 if(preset)return preset.key;
 const type=String(cfg.type||'').toLowerCase();
 if(['graduation','wedding','birthday','corporate'].includes(type))return type;
 return /quince/i.test(cfg.title||'')?'quince':'birthday';
}

// These inputs are display-only samples. Only the shared export renderer reads
// them; the rehearsal never invokes capture, archive, delivery or print ledgers.
export function rehearsalInputs(cfg,poses){
 if(!Array.isArray(poses)||poses.length!==4||poses.some(pose=>!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(pose||''))||new Set(poses).size!==4)
  throw new Error('Four sample photos must load before testing the printer.');
 const design=guestEventConfig(cfg),base={photo:poses[0],poses,cfg:design,monogram:eventMonogram(design),template:design.defaultTemplate,filter:'none',stripMode:'single'};
 return {one:{...base,layout:'card'},four:{...base,layout:'photo_strip'}};
}

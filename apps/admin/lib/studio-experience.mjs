// Pure event UI and form helpers. No database migrations: booth experience settings
// live inside the Event.theme JSON already present in the existing schema.
import {validateCustomDesign,isValidCustomDesign} from '../../booth/app/lib/custom-design.mjs';
import {isFprPrintPreset} from '../../booth/app/lib/fpr-print-presets.mjs';
export const BOOTH_URL='https://photobooth-booth-production.up.railway.app';
export const BOOTH_START_URL=BOOTH_URL+'/staff/start';
export const BOOTH_SETUP_URL=BOOTH_URL+'/setup';
export const BOOTH_PREPARATION_URL=BOOTH_URL+'/event-prep';
export const PHOTO_PAUSES=Object.freeze([6,9,12]);
export const COLORS=Object.freeze([
 {id:'champagne',name:'Champagne',primary:'#32463e',accent:'#d4ad73'},
 {id:'rose',name:'Rose Garden',primary:'#855665',accent:'#e4b4a1'},
 {id:'black-tie',name:'Black Tie',primary:'#222b37',accent:'#cba65c'},
 {id:'coastal',name:'Coastal Blue',primary:'#29546a',accent:'#a2c9d9'},
 {id:'botanical',name:'Botanical',primary:'#54715b',accent:'#c5bd89'},
 {id:'party',name:'Party Pop',primary:'#673b78',accent:'#e5b458'}
]);
export const EVENT_TYPES=Object.freeze(['Wedding','Birthday','Graduation','Quinceañera','Corporate','Party','Bar / Bat Mitzvah','Other celebration']);
const get=(data,key)=>String(typeof data?.get==='function'?data.get(key)??'':data?.[key]??'').trim();
const has=(data,key)=>typeof data?.has==='function'?data.has(key):typeof data?.get==='function'?data.get(key)!==null&&data.get(key)!==undefined:Object.hasOwn(data||{},key);
const cleanPrintName=(v,n=65)=>String(v??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,n);
export function standardDesignFor(type){
 const value=String(type||'').toLowerCase();
 if(value.includes('graduation'))return 'grad-gala';
 if(value.includes('quince'))return 'quince-royal';
 if(value.includes('mitzvah'))return 'blush';
 if(value.includes('corporate'))return 'blush';
 return 'ivory';
}
export function approvedDesignFor(type,choice){return choice==='custom'?'custom':isFprPrintPreset(choice)?choice:/graduation/i.test(String(type||''))&&choice==='grad-gala'?'grad-gala':/quince/i.test(String(type||''))&&choice==='quince-royal'?'quince-royal':['ivory','blush','champagne'].includes(choice)?choice:standardDesignFor(type);}
export function toLocalDay(value){
 const d=value instanceof Date?value:new Date(value);
 return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
}
export function wallTime(value){
 const d=value instanceof Date?value:new Date(value);
 return Number.isFinite(d.getTime())?d.toISOString().slice(11,16):'';
}
export function dateLabel(value){
 const date=toLocalDay(value);if(!date)return 'Date not set';
 return new Date(date+'T12:00:00.000Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
}
export function timeLabel(value){
 const t=wallTime(value),h=Number(t.slice(0,2)),m=t.slice(3,5);
 return t?String(h%12||12)+(m!=='00'?':'+m:'')+' '+(h>=12?'PM':'AM'):'Not set';
}
export function dateTimeFields(date,start,end){
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end))throw new Error('Enter a valid date, start time and end time.');
 const day=new Date(date+'T12:00:00.000Z');
 if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date)throw new Error('Choose a real calendar date.');
 const begin=new Date(date+'T'+start+':00.000Z'),finish=new Date(date+'T'+end+':00.000Z');
 if(begin.getTime()===finish.getTime())throw new Error('Start and end times must be different.');
 if(finish<begin)finish.setUTCDate(finish.getUTCDate()+1); // midnight event ends next day
 return {date:new Date(date+'T12:00:00.000Z'),startTime:begin,endTime:finish};
}
export function nonnegativePrints(value,fallback=108){
 if(value===null||value===undefined||String(value).trim()==='')return fallback;
 const n=Number(value);
 if(!Number.isInteger(n)||n<0||n>10000)throw new Error('Choose a print allowance between 0 and 10,000.');
 return n;
}
export function statusText(status){
 const values={DRAFT:'Draft',NEEDS_SETUP:'Needs setup',CONFIGURED:'Configured',LOADED_TO_BOOTH:'Loaded to booth',ACTIVE:'In progress',COMPLETED:'Completed',ARCHIVED:'Archived'};
 return values[status]||String(status||'Not set').replaceAll('_',' ');
}
export function readiness(event){
 const choice=event.theme?.boothExperience?.approvedDesign;
 const custom=choice==='custom';
 const savedDesign=custom?isValidCustomDesign(event.theme?.boothExperience?.customDesign):Boolean(choice&&approvedDesignFor(event.eventType,choice)===choice);
 const checks=[
  {id:'customer',title:'Customer details',ready:Boolean(event.customer?.name||event.customerId),href:'client'},
  {id:'venue',title:'Venue and address',ready:Boolean(event.venueName?.trim()&&event.venueAddress?.trim()),href:'venue'},
  {id:'booth',title:'Booth assigned',ready:Boolean(event.boothId||event.booth?.id),href:'equipment'},
  {id:'design',title:'Saved print design',ready:custom?savedDesign:Boolean(event.templateId||event.template?.id||savedDesign),href:'style'}
 ];
 const complete=checks.filter(x=>x.ready).length;
 return {checks,complete,total:checks.length,ready:complete===checks.length,next:checks.find(x=>!x.ready)||null};
}
export function experienceFrom(event){
 const theme=event?.theme&&typeof event.theme==='object'&&!Array.isArray(event.theme)?event.theme:{};
 const e=theme.boothExperience&&typeof theme.boothExperience==='object'&&!Array.isArray(theme.boothExperience)?theme.boothExperience:{};
 const pause=Number(e.pauseSeconds);
 const pal=COLORS.find(x=>x.id===e.paletteId);
 const validColor=v=>/^#[\da-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():null;
 return {
  featured:e.featured==='one'?'one':'four', // both guest choices remain available
  pauseSeconds:PHOTO_PAUSES.includes(pause)?pause:6,
  format:e.format==='strip'?'strip':'card',
  strips:e.strips===2||e.strips==='2'?2:1,
  photoFit:e.photoFit==='fit'?'fit':'fill',
  paletteId:pal?.id||'champagne',
  primary:validColor(e.primary)||pal?.primary||COLORS[0].primary,
  accent:validColor(e.accent)||pal?.accent||COLORS[0].accent,
  approvedDesign:approvedDesignFor(event?.eventType,e.approvedDesign),
  customDesign:isValidCustomDesign(e.customDesign)?validateCustomDesign(e.customDesign):null,
  nameOnPrint:cleanPrintName(e.nameOnPrint,65),
  classYear:/^\d{4}$/.test(e.classYear||'')?e.classYear:'',
 };
}
export function mergeExperience(theme,form){
 const current=theme&&typeof theme==='object'&&!Array.isArray(theme)?theme:{};
 const original=current.boothExperience&&typeof current.boothExperience==='object'&&!Array.isArray(current.boothExperience)?current.boothExperience:{};
 // Missing fields belong to the saved event, including older settings hidden
 // by a simpler editor. A submitted blank is a deliberate edit, not omission.
 const e={...experienceFrom({theme:current}),...original};
 if(has(form,'featured'))e.featured=get(form,'featured')==='one'?'one':'four';
 if(has(form,'pauseSeconds')){const pause=Number(get(form,'pauseSeconds'));e.pauseSeconds=PHOTO_PAUSES.includes(pause)?pause:6;}
 if(has(form,'format'))e.format=get(form,'format')==='strip'?'strip':'card';
 if(has(form,'strips'))e.strips=get(form,'strips')==='2'?2:1;
 if(has(form,'photoFit'))e.photoFit=get(form,'photoFit')==='fit'?'fit':'fill';
 const palette=COLORS.find(x=>x.id===(has(form,'paletteId')?get(form,'paletteId'):e.paletteId))||COLORS[0];
 if(has(form,'paletteId'))e.paletteId=palette.id;
 const color=(key,fallback)=>/^#[\da-f]{6}$/i.test(get(form,key))?get(form,key).toLowerCase():fallback;
 if(has(form,'primaryColor')||has(form,'paletteId'))e.primary=color('primaryColor',palette.primary);
 if(has(form,'accentColor')||has(form,'paletteId'))e.accent=color('accentColor',palette.accent);
 if(has(form,'approvedDesign')||has(form,'eventType'))e.approvedDesign=approvedDesignFor(get(form,'eventType'),has(form,'approvedDesign')?get(form,'approvedDesign'):Object.hasOwn(original,'approvedDesign')?original.approvedDesign:undefined);
 if(has(form,'nameOnPrint'))e.nameOnPrint=cleanPrintName(get(form,'nameOnPrint'),65);
 if(has(form,'classYear'))e.classYear=/^\d{4}$/.test(get(form,'classYear'))?get(form,'classYear'):'';
 if(has(form,'customDesign')){
  const raw=get(form,'customDesign');
  if(raw){let spec;try{spec=JSON.parse(raw);}catch{throw new Error('The custom design could not be read. Check both print layouts.');}e.customDesign=validateCustomDesign(spec);}
  else if(e.approvedDesign==='custom')throw new Error('Add a valid custom design for both 1 Photo and 4 Photos before saving.');
 }
 if(e.approvedDesign==='custom')e.customDesign=validateCustomDesign(e.customDesign);
 return {...current,boothExperience:e};
}
export function guestHandoffMessage(){
 return 'Event changes saved. On the booth, choose this event and its layout, then tap Start event.';
}

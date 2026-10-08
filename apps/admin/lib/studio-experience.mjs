// Pure event UI and form helpers. No database migrations: booth experience settings
// live inside the Event.theme JSON already present in the existing schema.
export const BOOTH_URL='https://photobooth-booth-production.up.railway.app';
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
export const EVENT_TYPES=Object.freeze(['Wedding','Birthday','Bar / Bat Mitzvah','Graduation','Corporate','Party','Other celebration']);
const get=(data,key)=>String(typeof data?.get==='function'?data.get(key)??'':data?.[key]??'').trim();
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
 const checks=[
  {id:'customer',title:'Customer details',ready:Boolean(event.customer?.name||event.customerId),href:'client'},
  {id:'venue',title:'Venue and address',ready:Boolean(event.venueName?.trim()&&event.venueAddress?.trim()),href:'venue'},
  {id:'booth',title:'Booth assigned',ready:Boolean(event.boothId||event.booth?.id),href:'equipment'},
  {id:'design',title:'Print design selected',ready:Boolean(event.templateId||event.template?.id),href:'equipment'}
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
 };
}
export function mergeExperience(theme,form){
 const current=theme&&typeof theme==='object'&&!Array.isArray(theme)?theme:{};
 const rawPalette=get(form,'paletteId'),palette=COLORS.find(x=>x.id===rawPalette)||COLORS[0];
 const existing=experienceFrom({theme:current});
 const featured=get(form,'featured')==='one'?'one':'four';
 const pause=Number(get(form,'pauseSeconds'));
 const format=get(form,'format')==='strip'?'strip':'card';
 const strips=get(form,'strips')==='2'?2:1;
 const photoFit=get(form,'photoFit')==='fit'?'fit':'fill';
 const validColor=v=>/^#[\da-f]{6}$/i.test(v)?v.toLowerCase():null;
 const choose=(key,base)=>validColor(get(form,key))||base;
 const e={
  ...existing,featured,pauseSeconds:PHOTO_PAUSES.includes(pause)?pause:6,
  format,strips,photoFit,
  paletteId:palette.id,
  primary:choose('primaryColor',palette.primary),accent:choose('accentColor',palette.accent)
 };
 return {...current,boothExperience:e};
}
export function guestHandoffMessage(){
 return 'Changes here are saved in the admin database. The event iPad stores its own setup: open Photo Booth setup on that device and match the choices before the event. This page does not silently change a live iPad.';
}

// Device-local sample event. Does not replace the October paid booking.
import {normalizePrintPackage} from './print-package.mjs';
import {normalizePrintLayouts} from './print-layouts.mjs';
export const GRADUATION_SHOWCASE_ID='graduation-showcase';
export const GRADUATION_SHOWCASE_KEY='friendly-booth-transfer-v1-'+GRADUATION_SHOWCASE_ID+'-config';
export const GRADUATION_SHOWCASE_URL='/?booth_event='+GRADUATION_SHOWCASE_ID;
export function graduationShowcaseConfig({name='LaMarr',year='2026',date='October 10, 2026'}={}){
 const safeName=String(name||'LaMarr').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,30)||'LaMarr';
 const safeYear=/^\d{4}$/.test(String(year))?String(year):'2026';
 const safeDate=String(date||'October 10, 2026').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,50)||'October 10, 2026';
 return {
  eventId:GRADUATION_SHOWCASE_ID,type:'graduation',title:safeName,subtitle:'Grad Party',
  date:safeDate,setupComplete:true,defaultTemplate:'grad-gala',
  photoFit:'fill',photoPauseSeconds:6,defaultPhotoExperience:'four',
  details:{graduate:safeName,classYear:safeYear,school:'',primaryColor:'#09244c',secondaryColor:'#ff962c'},
  printLayouts:normalizePrintLayouts({defaultLayout:'photo_strip',stripMode:'single',cardEnabled:true,stripEnabled:true}),
  printPackage:normalizePrintPackage({includedPrints:108,addOnPrints:0,shotsPerSession:4,printingEnabled:true,digitalEnabled:true})
 };
}
export function startGraduationShowcase(storage,fields){
 const cfg=graduationShowcaseConfig(fields);
 storage.setItem(GRADUATION_SHOWCASE_KEY,JSON.stringify(cfg));
 // The only write is the dedicated showcase config key.
 // Other photo archives, actual event settings and print counts are untouched.
 return GRADUATION_SHOWCASE_URL;
}

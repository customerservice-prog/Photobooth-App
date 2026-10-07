// Output layouts never alter capture count or physical-sheet allowance.
import {validateShotSet} from './photo-strip.mjs';
export const DEFAULT_PRINT_LAYOUTS=Object.freeze({cardEnabled:true,stripEnabled:true,defaultLayout:'card',stripMode:'double',useEventColors:true,footerText:''});
export const STRIP_DESIGNS=Object.freeze([
 Object.freeze({id:'ivory',name:'Classic White',description:'The original photo booth strip'}),
 Object.freeze({id:'blush',name:'Midnight',description:'Dark borders. Bright memories.'}),
 Object.freeze({id:'champagne',name:'Celebration',description:'Your party colors, in a strip'})
]);
export function normalizePrintLayouts(input){
 const v=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const cardEnabled=v.cardEnabled!==false,stripEnabled=v.stripEnabled!==false;
 // Invalid saved data still leaves a usable card option; explicit form saves validate below.
 const card=cardEnabled||!stripEnabled;
 return {cardEnabled:card,stripEnabled,defaultLayout:v.defaultLayout==='photo_strip'&&stripEnabled?'photo_strip':card?'card':'photo_strip',stripMode:v.stripMode==='single'?'single':'double',useEventColors:v.useEventColors!==false,footerText:String(v.footerText??'').replace(/[\u0000-\u001f]/g,' ').slice(0,80)};
}
export function validatePrintLayouts(input){
 if(input?.cardEnabled===false&&input?.stripEnabled===false)throw new Error('Keep at least one photo layout enabled.');
 const v=normalizePrintLayouts(input);return {...v,footerText:v.footerText.trim()};
}
export function hasOriginalPoses(poses,total){try{validateShotSet(poses,total);return true;}catch{return false;}}
export function initialPrintLayout(settings,poses,total){
 const rules=normalizePrintLayouts(settings);
 return rules.defaultLayout==='photo_strip'&&(!rules.cardEnabled||hasOriginalPoses(poses,total))?'photo_strip':'card';
}
export function getStripDesign(id){return STRIP_DESIGNS.find(d=>d.id===id)||STRIP_DESIGNS[0];}
export function stripDescription(mode){return mode==='single'?'One vertical strip centered on a 4×6 sheet':'Two matching 2×6 strips on one 4×6 sheet';}

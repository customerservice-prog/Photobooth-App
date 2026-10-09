import {getDesign} from './template-registry.mjs';
import {validateCustomDesign} from './custom-design.mjs';

// Rendering-only view: old saved events use the same preloaded artwork for
// one or four poses without rewriting their settings, photos or print usage.
export function guestEventConfig(cfg={}){
 const saved=cfg&&typeof cfg==='object'&&!Array.isArray(cfg)?cfg:{};
 if(saved.defaultTemplate==='custom')return {...saved,guestMode:'approved',defaultTemplate:'custom',customDesign:validateCustomDesign(saved.customDesign)};
 return {...saved,guestMode:'approved',defaultTemplate:getDesign(saved.type,saved.defaultTemplate||'ivory').id};
}

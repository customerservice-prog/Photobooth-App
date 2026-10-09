import {getDesign} from './template-registry.mjs';

// Rendering-only view: old saved events use the same preloaded artwork for
// one or four poses without rewriting their settings, photos or print usage.
export function guestEventConfig(cfg={}){
 const saved=cfg&&typeof cfg==='object'&&!Array.isArray(cfg)?cfg:{};
 return {...saved,guestMode:'approved',defaultTemplate:getDesign(saved.type,saved.defaultTemplate||'ivory').id};
}

import {resolveTemplate,normalizeEventType} from './registry.mjs';
/** The one entry point for gallery, large preview, print-only card and finished JPEG. */
export function renderTemplateSvg(input={}){
 const type=normalizeEventType(input.cfg?.type),template=resolveTemplate(type,input.template);
 const rendered=template.render({...input,cfg:{...input.cfg,type}});
 // The preserved wedding/birthday compositions gain a canonical identifier, without a pixel change.
 return rendered.includes('data-template-id=')?rendered:rendered.replace('<svg ','<svg data-template-id="'+template.id+'" ');
}

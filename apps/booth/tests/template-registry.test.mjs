import test from 'node:test';
import assert from 'node:assert/strict';
import {allTemplates,getTemplatesForEvent,resolveTemplate,getTemplateById,canonicalTemplateId,catalog} from '../app/lib/templates/registry.mjs';
import {renderTemplateSvg} from '../app/lib/templates/render.mjs';
import {renderKeepsake as oldRender} from '../app/lib/keepsake-classics.mjs';
import {applySvgPhotoFinish} from '../app/lib/svg-photo-finish.mjs';
import {getDesigns,renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {fieldsForEvent} from '../app/lib/templates/fields.mjs';
const names=['wedding','birthday','mitzvah','graduation','corporate','other'];
const cfg=type=>({type,title:'Test & Event',subtitle:'Family & Friends',date:'September 22, 2026',details:{}});
test('18 canonical IDs are unique and addressable',()=>{assert.equal(allTemplates.length,18);assert.equal(new Set(allTemplates.map(t=>t.id)).size,18);for(const t of allTemplates)assert.equal(getTemplateById(t.id),t);});
for(const event of names){
 test(event+' has three registered renderers and compositions',()=>{const group=getTemplatesForEvent(event);assert.equal(group.length,3);assert.equal(new Set(group.map(t=>t.layout)).size,3);assert.equal(new Set(group.map(t=>t.render)).size,3);assert(group.every(t=>t.eventType===event));});
 test(event+' legacy IDs map without changing saved settings',()=>{for(const [i,slot]of ['ivory','blush','champagne'].entries()){const t=resolveTemplate(event,slot);assert.equal(t,getTemplatesForEvent(event)[i]);assert.equal(canonicalTemplateId(event,slot),t.id);assert.equal(getDesigns(event)[i].id,slot);}});
 test(event+' facade, print and canonical renderer produce the same artwork',()=>{for(const t of getTemplatesForEvent(event)){const a={cfg:cfg(event),id:'proof',template:t.id};assert.equal(renderTemplateSvg(a),renderKeepsake({...a,template:t.legacyId}));assert(renderKeepsake(a).includes('data-template-id="'+t.id+'"'));}});
 test(event+' never renders a template from the wrong family',()=>{const wrong=event==='birthday'?'wedding_rosewater':'birthday_balloon';assert.equal(resolveTemplate(event,wrong),getTemplatesForEvent(event)[0]);});
 test(event+' has safe photo geometry inside the sheet',()=>{for(const t of getTemplatesForEvent(event)){const b=t.photo;assert(b.x>=0&&b.y>=0);assert(b.x+b.width<=1200);assert(b.y+b.height<=1360);}});
}
test('wedding and birthday approved artwork is preserved with main SVG finish safety',()=>{for(const event of ['wedding','birthday'])for(const t of getTemplatesForEvent(event)){const args={cfg:cfg(event),id:'same',template:t.legacyId};const rendered=renderKeepsake(args).replace(/data-template-(id|key)="[^"]*" /g,'');assert.equal(rendered,applySvgPhotoFinish(oldRender(args),undefined,'same'));}});
test('metadata does not contain render functions or executable field content',()=>{const data=catalog();assert.equal(data.length,6);assert(!JSON.stringify(data).includes('function'));assert.equal(data.flatMap(e=>e.templates).length,18);});
test('all non-classic compositions are distinct even with identical colors',()=>{const outputs=allTemplates.filter(t=>!['wedding','birthday'].includes(t.eventType)).map(t=>t.render({cfg:cfg(t.eventType),id:'same'}).replace(/#[a-fA-F0-9]{3,8}\b/g,'#COLOR').replace(/data-(template-id|design|layout)="[^"]*"/g,''));assert.equal(new Set(outputs).size,12);});
test('unknown or prototype event identifiers use safe defaults',()=>{for(const type of ['toString','__proto__','constructor','',null])assert.equal(resolveTemplate(type,'no').id,'other_blooms');});
test('user SVG and remote photo sources cannot be injected',()=>{for(const t of allTemplates){const s=renderKeepsake({cfg:{...cfg(t.eventType),title:'<script>alert(1)</script>',subtitle:'<image href="https://attacker.invalid"/>'},template:t.id,photo:'https://attacker.invalid/photo',filter:'url(https://attacker.invalid)'});assert(!s.includes('<script>'));assert(!s.includes('<image href="https://attacker.invalid'));assert(!s.includes('style="filter:url'));}});
test('stationary artwork contains no animation, scripts, or external fonts',()=>{for(const t of allTemplates){const s=renderKeepsake({cfg:cfg(t.eventType),template:t.id});assert(!/<animate|<script|<foreignObject|@font-face|@keyframes/.test(s));}});
test('whole-photo mode uses a safe rectangle inside the retained arch',()=>{const s=renderKeepsake({cfg:{type:'mitzvah',photoFit:'fit'},template:'mitzvah_mosaic',photo:'data:image/jpeg;base64,/9j/2Q=='});assert(s.includes('xMidYMid meet'));assert(s.includes('<clipPath id="card-photo"><path'));const tag=s.match(/<image\b(?=[^>]*data-guest-photo="true")[^>]*>/)[0];const y=Number(tag.match(/\sy="([^"]*)"/)[1]);assert(y>235);});
test('all event fields and brand tagline have one shared schema',()=>{assert(fieldsForEvent('corporate').some(f=>f.key==='tagline'));assert(fieldsForEvent('mitzvah').some(f=>f.key==='symbols'));for(const t of allTemplates)assert.equal(t.fields,fieldsForEvent(t.eventType));});
test('specific religious motifs are opt-in rather than inferred from names',()=>{const s=renderKeepsake({cfg:{type:'mitzvah',title:'Sam',details:{honoree:'Sam',symbols:'Star of David'}},template:'mitzvah_timeless'});const plain=renderKeepsake({cfg:{type:'mitzvah',title:'Sam',details:{honoree:'Sam'}},template:'mitzvah_timeless'});assert.notEqual(s,plain);});

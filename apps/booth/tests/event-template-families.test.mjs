import test from 'node:test';
import assert from 'node:assert/strict';
import {TEMPLATE_FAMILIES,getDesigns,getDesign,renderKeepsake} from '../app/lib/keepsake-designs.mjs';
const photo='data:image/jpeg;base64,/9j/2Q==';
const types=['wedding','birthday','mitzvah','graduation','corporate','other'];
for(const type of types){
 test(type+' registry exposes three stable IDs and three composition keys',()=>{const list=getDesigns(type);assert.deepEqual(list.map(d=>d.id),['ivory','blush','champagne']);assert.equal(new Set(list.map(d=>d.layout)).size,3);assert(list.every(d=>d.family===type&&d.key.startsWith(type+'/')&&d.supportedFields.includes('date')));});
 test(type+' descriptor resolves the same template through legacy ID and canonical key',()=>{for(const d of getDesigns(type))assert.equal(getDesign(type,d.key),getDesign(type,d.id));});
 test(type+' all outputs carry actual composition identity and original guest image',()=>{for(const d of getDesigns(type)){const s=renderKeepsake({photo,cfg:{type,title:'Alex & Jordan',date:'September 21, 2026'},template:d.id});assert(s.includes(`data-template-key="${d.key}"`));assert(s.includes('data-guest-photo="true"'));assert(s.includes(photo));assert(s.includes('Alex &amp; Jordan'));assert(!s.includes('<animate'));}});
 test(type+' fit mode and photo finish propagate into every composition',()=>{for(const d of getDesigns(type)){const s=renderKeepsake({photo,cfg:{type,photoFit:'fit'},template:d.id,filter:'grayscale(1) contrast(1.08) brightness(1.04)'});assert(s.includes('xMidYMid meet'));assert(s.includes('data-photo-finish="bw"'));assert(s.includes('feColorMatrix'));assert(s.includes('filter="url(#'));}});
 test(type+' user text and arbitrary image URLs cannot inject executable markup',()=>{for(const d of getDesigns(type)){const s=renderKeepsake({photo:'https://not-allowed.example/x.jpg',cfg:{type,title:'<script>alert(1)</script>',subtitle:'<foreignObject>bad</foreignObject>',date:'" onload="alert(1)'},template:d.id,filter:'url(https://not-allowed.example)'});assert(!s.includes('<script>'));assert(!s.includes('<foreignObject>'));assert(!s.includes('not-allowed.example'));assert(!s.includes('onload="alert(1)'));}});
}
test('registry and nested descriptors are immutable',()=>{assert(Object.isFrozen(TEMPLATE_FAMILIES));assert(Object.isFrozen(getDesigns('wedding')));assert(Object.isFrozen(getDesign('other','ivory')));assert.throws(()=>{getDesign('wedding','ivory').name='bad';});});
test('all eighteen template keys are unique',()=>assert.equal(new Set(types.flatMap(t=>getDesigns(t).map(d=>d.key))).size,18));
test('unknown and prototype names use Other rather than object prototypes',()=>{for(const t of ['nope','constructor','__proto__',null])assert.equal(getDesign(t,'ivory').family,'other');});
test('template from a different family cannot override selected event',()=>assert.equal(getDesign('birthday','wedding/botanical').family,'birthday'));
test('graduate year is dynamic rather than baked into a background image',()=>{const s=renderKeepsake({cfg:{type:'graduation',details:{graduate:'Morgan',classYear:'2029',school:'Test School'}},template:'champagne'});assert(s.includes('2029'));assert(s.includes('Morgan'));assert(s.includes('Test School'));assert(!s.includes('2026'));});
test('mitzvah name, Hebrew text and event title remain user supplied',()=>{for(const d of getDesigns('mitzvah')){const s=renderKeepsake({cfg:{type:'mitzvah',details:{honoree:'Maya',mitzvahType:'Bat Mitzvah',hebrewName:'שרה'}},template:d.id});assert(s.includes('Maya'));assert(s.includes('BAT MITZVAH'));assert(s.includes('שרה'));}});

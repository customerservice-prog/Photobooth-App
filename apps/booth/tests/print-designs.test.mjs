import test from 'node:test';
import assert from 'node:assert/strict';
import {getDesigns,getDesign,eventCopy,fitText,renderKeepsake,EVENT_LABELS} from '../app/lib/keepsake-designs.mjs';
for(const type of Object.keys(EVENT_LABELS)){
 test(type+' has three genuinely different compositions',()=>{const d=getDesigns(type);assert.equal(d.length,3);assert.equal(new Set(d.map(x=>x.layout)).size,3);assert.deepEqual(d.map(x=>x.id),['ivory','blush','champagne']);});
 test(type+' renders three stationary self-contained 4x6 SVGs',()=>{for(const d of getDesigns(type)){const s=renderKeepsake({cfg:{type,title:'Test event',date:'September 21, 2026'},template:d.id});assert(s.includes('viewBox="0 0 1200 1800"'));assert(s.includes('data-design="'+type+'-'+d.id+'"'));assert(!/<animate|<script|<foreignObject|@keyframes|\banimation:/.test(s));}});
}
test('all 18 names are unique',()=>assert.equal(new Set(Object.keys(EVENT_LABELS).flatMap(t=>getDesigns(t).map(d=>d.name))).size,18));
test('unknown inputs resolve to safe default design',()=>assert.equal(getDesign('nonsense','bad').layout,'botanical'));
test('wedding spouse names and venue personalize every layout',()=>{const cfg={type:'wedding',title:'old',details:{partner1:'Alex',partner2:'Jordan',venue:'The Garden House'}};for(const d of getDesigns('wedding')){const s=renderKeepsake({cfg,template:d.id});assert(s.includes('Alex &amp; Jordan'));assert(s.includes('The Garden House'));}});
test('birthday age and name drive actual artwork',()=>{const c=eventCopy({type:'birthday',details:{honoree:'Taylor',age:'30'}});assert.equal(c.title,'Taylor');assert.equal(c.seal,'30');assert.equal(c.eyebrow,'HAPPY BIRTHDAY');});
test('graduation year and school drive actual artwork',()=>{const c=eventCopy({type:'graduation',details:{graduate:'Morgan',classYear:'2026',school:'Example School'}});assert.equal(c.eyebrow,'CLASS OF 2026');assert.equal(c.subtitle,'Example School');});
test('mitzvah celebration type and Hebrew name are preserved',()=>{const c=eventCopy({type:'mitzvah',details:{honoree:'Sam',mitzvahType:'Bat Mitzvah',hebrewName:'שרה'}});assert.equal(c.eyebrow,'Bat Mitzvah');assert(c.subtitle.includes('שרה'));});
test('corporate masthead uses the actual company',()=>{const s=renderKeepsake({cfg:{type:'corporate',details:{company:'North & Co.',eventName:'Annual Gala'}},template:'ivory'});assert(s.includes('NORTH &amp; CO.'));assert(s.includes('Annual Gala'));});
test('event fields cannot inject SVG markup',()=>{const s=renderKeepsake({cfg:{title:'<script>alert(1)</script>',subtitle:'" onload="evil()',date:'<image href="https://bad">'}});assert(!s.includes('<script>'));assert(!s.includes('onload="evil()'));assert(s.includes('&lt;script&gt;'));});
test('only raster data and approved local test art are accepted',()=>{for(const photo of ['https://evil/a.jpg','javascript:alert(1)','data:image/svg+xml;base64,aaa','/private'])assert(!renderKeepsake({photo}).includes('<image href='));});
test('raster photo appears in print SVG, without remote requests',()=>{const photo='data:image/jpeg;base64,/9j/2Q==';assert(renderKeepsake({photo}).includes('href="'+photo+'"'));});
test('test pattern is contained, guest photos use crop-to-fill',()=>{assert(renderKeepsake({photo:'/print-test.svg'}).includes('xMidYMid meet'));assert(renderKeepsake({photo:'data:image/jpeg;base64,/9j/2Q=='}).includes('xMidYMid slice'));});
test('safe filter allowlist prevents arbitrary CSS',()=>{assert(!renderKeepsake({filter:'url(https://evil)'}).includes('https://evil'));});
test('unique IDs separate thumbnails from large card clips',()=>{const a=renderKeepsake({id:':r1:'}),b=renderKeepsake({id:':r2:'});assert(a.includes('id="r1-photo"'));assert(b.includes('id="r2-photo"'));});
test('long names wrap without losing content',()=>{const name='Alexandria Montgomery & Christopher Wainwright';const f=fitText(name,970,74,2);assert(f.lines.length<=2);assert.equal(f.lines.join(' '),name);});
test('renderer is deterministic for the same input',()=>{const a={cfg:{type:'wedding',title:'Alex & Jordan'},id:'same'};assert.equal(renderKeepsake(a),renderKeepsake(a));});

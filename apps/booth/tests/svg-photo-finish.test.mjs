import test from 'node:test';
import assert from 'node:assert/strict';
import {applySvgPhotoFinish} from '../app/lib/svg-photo-finish.mjs';
const svg='<svg><image data-guest-photo="true" href="data:image/jpeg;base64,/9j/2Q==" style="filter:none"/><image data-artwork="rose" href="data:image/png;base64,YQ=="/></svg>';
for(const [filter,name]of [['brightness(1.08) contrast(.96) saturate(.88)','glam'],['grayscale(1) contrast(1.08) brightness(1.04)','bw'],['sepia(.18) saturate(.92) brightness(1.03)','warm']])test(name+' uses native SVG primitives only on the photograph',()=>{const s=applySvgPhotoFinish(svg,filter,':r1:');assert(s.includes('data-photo-finish="'+name+'"'));assert(s.includes('id="r1-photo-finish"'));assert(s.includes('color-interpolation-filters="sRGB"'));assert(!s.includes('style="filter:'));assert(s.includes('<image data-artwork="rose" href="data:image/png;base64,YQ=="/>'));});
test('original uses no image filter graph',()=>{const s=applySvgPhotoFinish(svg,'none');assert(!s.includes('<filter '));assert(s.includes('data-photo-finish="none"'));});
test('unknown or external filter cannot be rendered',()=>{const s=applySvgPhotoFinish(svg,'url(https://bad.example)');assert(!s.includes('bad.example'));assert(!s.includes('<filter '));});
test('two previews cannot share filter IDs accidentally',()=>{assert(applySvgPhotoFinish(svg,'grayscale(1) contrast(1.08) brightness(1.04)',':r1:').includes('url(#r1-photo-finish)'));assert(applySvgPhotoFinish(svg,'grayscale(1) contrast(1.08) brightness(1.04)',':r2:').includes('url(#r2-photo-finish)'));});

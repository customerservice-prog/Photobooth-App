import test from 'node:test';
import assert from 'node:assert/strict';
import {containedPhotoBox} from '../app/lib/templates/svg-kit.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
test('whole-photo content rectangle is fully inside the arched crop',()=>{const b={x:166,y:220,w:868,h:1100,shape:'arch'},v=containedPhotoBox(b,true),r=b.w/2,cx=b.x+r,cy=b.y+r;for(const x of [v.x,v.x+v.w])assert((x-cx)**2+(v.y-cy)**2<=r*r);assert(v.y+v.h<=b.y+b.h);assert(v.x>=b.x&&v.x+v.w<=b.x+b.w);});
test('fit and fill actually use different image boxes in the mosaic renderer',()=>{const photo='data:image/jpeg;base64,/9j/2Q==',a=renderKeepsake({photo,cfg:{type:'mitzvah',photoFit:'fit'},template:'champagne'}),b=renderKeepsake({photo,cfg:{type:'mitzvah',photoFit:'fill'},template:'champagne'});const image=s=>s.match(/<image data-guest-photo="true"[^>]*>/)[0];assert.notEqual(image(a),image(b));assert(image(a).includes('xMidYMid meet'));assert(image(b).includes('xMidYMid slice'));});

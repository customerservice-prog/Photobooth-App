import test from 'node:test';
import assert from 'node:assert/strict';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
const cfg={type:'graduation',title:'LaMarr',date:'October 10th, 2026',details:{graduate:'LaMarr',classYear:'2026'}};
const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,AA'+n+'=');
test('LaMarr four-photo graduation layout uses exactly four distinct guest pictures',()=>{
 const svg=renderKeepsake({layout:'photo_strip',stripMode:'single',cfg,poses});
 assert.match(svg,/data-design="lamarr-graduation"/);
 assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,4);
 for(const pose of poses)assert.ok(svg.includes(pose));
 assert.match(svg,/October 10th, 2026/);
 assert.match(svg,/LaMarr/);
 assert.doesNotMatch(svg,/Page 1 of 1|http:\/\/|https:\/\//);
});
test('LaMarr one-photo layout uses only actual chosen guest photo',()=>{
 const svg=renderKeepsake({layout:'card',cfg,photo:poses[0]});
 assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,1);
 assert.ok(svg.includes(poses[0]));
 assert.ok(!svg.includes(poses[1]));
});
test('Unrelated events continue using their existing design',()=>{
 const svg=renderKeepsake({layout:'card',cfg:{...cfg,title:'Another Graduate',details:{graduate:'Another Graduate'}},photo:poses[0]});
 assert.doesNotMatch(svg,/data-design="lamarr-graduation"/);
});

import assert from 'node:assert/strict';

// Validate the business output: four camera poses, two matching 2x6 keepsakes
// on one 4x6 sheet. The two copies are print windows, not eight camera captures.
export function assertApprovedStripWindows(images,label,{sourceKey='source'}={}){
 assert.equal(images.length,8,label+' has two four-photo strips on one sheet');
 assert.deepEqual(images.map(image=>Number(image.pose)),[1,2,3,4,1,2,3,4],label+' keeps capture order in both strips');
 assert.deepEqual(images.map(image=>Number(image.copy)),[1,1,1,1,2,2,2,2],label+' identifies the two matching copies');
 const left=images.slice(0,4),right=images.slice(4),first=left[0],close=(a,b)=>assert(Math.abs(a-b)<.04,label+' matching geometry differs only by the 600px strip offset');
 for(let pose=0;pose<4;pose++){
  const a=left[pose],b=right[pose];
  assert(a.x>=0&&a.y>=0&&a.x+a.width<=600.02&&a.y+a.height<=1800.02,label+' left windows stay inside their 2x6 half');
  assert(b.x>=600&&b.y>=0&&b.x+b.width<=1200.02&&b.y+b.height<=1800.02,label+' right windows stay inside their 2x6 half');
  assert(a.width>=510,label+' fills most of each strip width with the actual guest photograph');
  assert(a.width/a.height>=1.5&&a.width/a.height<=1.75,label+' uses landscape photo windows like the approved strip reference');
  close(a.x,first.x);close(a.width,first.width);close(a.height,first.height);
  close(a.x+600,b.x);close(a.y,b.y);close(a.width,b.width);close(a.height,b.height);
  if(pose>0){const previous=left[pose-1],gap=a.y-previous.y-previous.height;assert(gap>=8&&gap<=24,label+' stacks four photos with slim decorative gutters');}
  if(a[sourceKey]!==undefined){assert.equal(a[sourceKey],b[sourceKey],label+' duplicates the same captured pose in the matching copy');}
 }
 assert(images.reduce((area,image)=>area+image.width*image.height,0)/(1200*1800)>=.65,label+' reserves most of the paper for guest photographs');
 if(images.every(image=>image[sourceKey]!==undefined))assert.equal(new Set(images.map(image=>image[sourceKey])).size,4,label+' contains exactly four unique originals, each reused once');
 return {copies:2,posesPerCopy:4,landscapeRatio:Number((first.width/first.height).toFixed(3)),photoCoverage:Number((images.reduce((area,image)=>area+image.width*image.height,0)/(1200*1800)).toFixed(3))};
}

export async function assertApprovedStripPreview(svg,label){
 const images=await svg.evaluate(element=>[...element.querySelectorAll('image[data-guest-photo="true"]')].map(image=>{
  // Graduation's self-contained strip groups use local coordinates; presets
  // and custom builder windows already carry absolute sheet coordinates.
  const transform=image.closest('[data-fpr-strip-copy]')?.getAttribute('transform'),offset=Number(transform?.match(/^translate\((\d+)\s+0\)$/)?.[1]||0);
  return {pose:Number(image.getAttribute('data-pose')),copy:Number(image.getAttribute('data-copy')),source:image.getAttribute('href'),x:Number(image.getAttribute('x'))+offset,y:Number(image.getAttribute('y')),width:Number(image.getAttribute('width')),height:Number(image.getAttribute('height'))};
 }));
 return assertApprovedStripWindows(images,label);
}

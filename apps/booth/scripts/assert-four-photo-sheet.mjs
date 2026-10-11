import assert from 'node:assert/strict';

// Four camera originals appear once each, arranged as one large 2x2 keepsake.
export function assertFourPhotoSheet(images,label,{sourceKey='source'}={}){
 assert.equal(images.length,4,label+' prints exactly four photographs on one 4x6 sheet');
 assert.deepEqual(images.map(image=>Number(image.pose)),[1,2,3,4],label+' prints each captured pose exactly once in order');
 assert(images.every(image=>!image.copy||Number(image.copy)===1),label+' does not duplicate the photographs in a second copy');
 const [a,b,c,d]=images,close=(x,y)=>assert(Math.abs(x-y)<.04,label+' gives the four photos equal aligned openings');
 for(const image of images){
  assert(image.width>=500&&image.height>=500,label+' gives each pose a large photograph');
  assert(image.x>=0&&image.y>=0&&image.x+image.width<=1200.02&&image.y+image.height<=1800.02,label+' keeps every photograph inside the 4x6 sheet');
  close(image.width,a.width);close(image.height,a.height);
 }
 close(a.y,b.y);close(c.y,d.y);close(a.x,c.x);close(b.x,d.x);
 assert(b.x>a.x+a.width&&c.y>a.y+a.height,label+' forms two columns and two rows with visible decorative gutters');
 assert(b.x-a.x-a.width<=40&&c.y-a.y-a.height<=40,label+' uses slim gutters between the photographs');
 assert(a.x<=80&&b.x+b.width>=1120,label+' uses most of the full paper width');
 const photoCoverage=images.reduce((area,image)=>area+image.width*image.height,0)/(1200*1800);
 assert(photoCoverage>=.58,label+' reserves most of the paper for guest photographs');
 if(images.every(image=>image[sourceKey]!==undefined))assert.equal(new Set(images.map(image=>image[sourceKey])).size,4,label+' uses all four distinct originals without reusing a pose');
 return {photographs:4,copies:1,photoCoverage:Number(photoCoverage.toFixed(3))};
}

export async function assertFourPhotoPreview(svg,label){
 const images=await svg.evaluate(element=>[...element.querySelectorAll('image[data-guest-photo="true"]')].map(image=>({
  pose:Number(image.getAttribute('data-pose')),copy:Number(image.getAttribute('data-copy')),source:image.getAttribute('href'),x:Number(image.getAttribute('x')),y:Number(image.getAttribute('y')),width:Number(image.getAttribute('width')),height:Number(image.getAttribute('height'))
 })));
 return assertFourPhotoSheet(images,label);
}

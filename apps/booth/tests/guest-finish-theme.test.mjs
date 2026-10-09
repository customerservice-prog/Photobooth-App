import test from 'node:test';
import assert from 'node:assert/strict';
import {guestFinishTheme,themeFromArtwork,artworkPaletteFromPixels,themeContrast} from '../app/lib/guest-finish-theme.mjs';
import {createCustomDesign} from '../app/lib/custom-design.mjs';

const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwioAAAAASUVORK5CYII=';
const upload=()=>{const spec=createCustomDesign('upload');spec.layouts.one.image=PNG;spec.layouts.four.image=PNG;return spec;};
const pixelColor=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
function raster(color){const data=new Uint8ClampedArray(64*96*4),channels=pixelColor(color);for(let i=0;i<data.length;i+=4)data.set([...channels,255],i);return data;}
function contrastSafe(theme){
 const style=theme.style;
 assert(themeContrast(style['--ag-paper'],style['--ag-ink'])>=4.5,'main text is readable');
 assert(themeContrast(style['--ag-surface'],style['--ag-ink'])>=4.5,'surface text is readable');
 assert(themeContrast(style['--ag-panel'],style['--ag-ink'])>=4.5,'panel text is readable');
 assert(themeContrast(style['--ag-paper'],style['--ag-muted'])>=4.5,'helper text is readable');
 assert(themeContrast(style['--ag-accent'],style['--ag-accent-ink'])>=4.5,'primary action text is readable');
 assert(themeContrast(style['--ag-header'],style['--ag-header-ink'])>=4.5,'header text is readable');
}

test('finish page follows the selected graduation and wedding artwork palettes',()=>{
 const grad=guestFinishTheme({type:'graduation',defaultTemplate:'grad-gala'}),wedding=guestFinishTheme({type:'wedding',defaultTemplate:'ivory'});
 assert.equal(grad.palette.paper,'#05182f');assert.equal(grad.palette.accent,'#ff972b');
 assert.equal(wedding.palette.paper,'#f7f1e7');assert.equal(wedding.palette.accent,'#b19565');
 assert.notEqual(grad.style['--ag-header'],wedding.style['--ag-header']);
 contrastSafe(grad);contrastSafe(wedding);
});
test('custom builder follows owner colors without changing the saved specification',()=>{
 const spec=createCustomDesign();spec.background='#733e98';spec.ink='#ffffff';spec.accent='#dcb258';
 const before=JSON.stringify(spec),theme=guestFinishTheme({defaultTemplate:'custom',customDesign:spec});
 assert.equal(theme.source,'custom-build');assert.equal(theme.palette.paper,'#733e98');assert.equal(theme.palette.accent,'#dcb258');
 assert.equal(JSON.stringify(spec),before);contrastSafe(theme);
});
test('white, black and mismatched owner text colors always yield readable screen text',()=>{
 for(const color of ['#ffffff','#000000','#777777','#ffdd00']){
  const spec=createCustomDesign();spec.background=color;spec.ink=color;spec.accent=color;
  contrastSafe(guestFinishTheme({defaultTemplate:'custom',customDesign:spec}));
 }
});
test('uploaded artwork initially uses a neutral dark theme rather than builder defaults',async()=>{
 const spec=upload(),before=JSON.stringify(spec),theme=guestFinishTheme({defaultTemplate:'custom',customDesign:spec});
 assert.equal(theme.palette.paper,'#111827');assert.equal(theme.source,'custom-upload');contrastSafe(theme);
 assert.deepEqual(await themeFromArtwork(spec,'card'),theme);
 assert.equal(JSON.stringify(spec),before);
});
test('edge sampling follows navy/gold art and excludes photo openings and the center',()=>{
 const data=raster('#05182f'),gold=pixelColor('#e6b85c'),sampleFace=pixelColor('#f06473');
 for(let y=0;y<96;y++)for(let x=0;x<64;x++){
  if(x<2||x>=62||y<2||y>=94)data.set([...gold,255],(y*64+x)*4);
  if(x>=8&&x<56&&y>=15&&y<75)data.set([...sampleFace,255],(y*64+x)*4);
 }
 const theme=artworkPaletteFromPixels({data,width:64,height:96,rects:[{x:8,y:14,w:84,h:65}]});
 assert.equal(theme.paper,'#05182f');assert.equal(theme.accent,'#e6b85c');
 assert.notEqual(theme.paper,'#f06473');assert.notEqual(theme.accent,'#f06473');
});
test('transparent uploaded edges use the same background as the printed custom artwork',()=>{
 const data=raster('#ff0000');for(let index=3;index<data.length;index+=4)data[index]=0;
 const palette=artworkPaletteFromPixels({data,width:64,height:96,background:'#f4ece1'});
 assert.equal(palette.paper,'#f4ece1');assert(themeContrast(palette.paper,palette.ink)>=4.5);
 for(const color of ['#ffffff','#000000'])assert.equal(artworkPaletteFromPixels({data:raster(color),width:64,height:96}).paper,color);
});
test('sampling remains bounded and rejects invalid remote artwork before any image read',async()=>{
 assert.throws(()=>artworkPaletteFromPixels({data:new Uint8Array(65*96*4),width:65,height:96}),/bounded/);
 const spec=upload();spec.layouts.one.image='https://example.test/customer-photo.jpg';
 await assert.rejects(themeFromArtwork(spec),/PNG or JPEG/);
});
test('async sampling reads the selected uploaded frame locally and releases its bounded canvas',async()=>{
 const spec=upload();spec.layouts.four.image='data:image/jpeg;base64,/9j/AA==';
 const originalImage=Object.getOwnPropertyDescriptor(globalThis,'Image'),originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const reads=[],canvases=[];let failCanvas=false;
 class ArtworkImage{
  naturalWidth=1200;naturalHeight=1800;
  set src(value){this.value=value;if(value){reads.push(value);queueMicrotask(()=>this.onload?.());}}
  get src(){return this.value;}
 }
 try{
  globalThis.Image=ArtworkImage;
  globalThis.document={createElement(name){
   assert.equal(name,'canvas');
   const canvas={width:0,height:0,getContext(kind){
    assert.equal(kind,'2d');if(failCanvas)return null;
    let color;
    return {fillRect(){},drawImage(image,x,y,width,height){
     assert.equal(canvas.width,64);assert.equal(canvas.height,96);assert.equal(width,64);assert.equal(height,96);
     color=image.src===PNG?'#05182f':'#733e98';
    },getImageData(x,y,width,height){assert.equal(width,64);assert.equal(height,96);return {data:raster(color)};}};
   }};canvases.push(canvas);return canvas;
  }};
  const one=await themeFromArtwork(spec,'card'),four=await themeFromArtwork(spec,'photo_strip');
  assert.equal(one.palette.paper,'#05182f');assert.equal(four.palette.paper,'#733e98');
  assert.deepEqual(reads,[PNG,spec.layouts.four.image]);assert(canvases.every(canvas=>canvas.width===0&&canvas.height===0));
  contrastSafe(one);contrastSafe(four);
  failCanvas=true;
  assert.equal((await themeFromArtwork(spec,'four')).palette.paper,'#111827','failed sampling retains the neutral theme');
  await assert.rejects(themeFromArtwork(spec,'wrong'),/one-photo or four-photo/);
 }finally{
  if(originalImage)Object.defineProperty(globalThis,'Image',originalImage);else delete globalThis.Image;
  if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else delete globalThis.document;
 }
});

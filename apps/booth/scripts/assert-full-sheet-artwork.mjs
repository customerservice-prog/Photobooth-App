import assert from 'node:assert/strict';
import sharp from 'sharp';

// These narrow bands sit outside every formerly contained preset image. Real
// decorations reaching both paper edges vary here; the old unused side mats
// were solid background. Test the browser's finished JPEG, not only its SVG.
export async function assertFullSheetPresetArtwork(bytes,label){
 const metadata=await sharp(bytes).metadata();
 assert.equal(metadata.width,1200,label+' has the full 4x6 width');
 assert.equal(metadata.height,1800,label+' has the full 4x6 height');
 const bands=[];
 for(const [side,left]of [['left',16],['right',1128]]){
  const band=await sharp(bytes).extract({left,top:0,width:56,height:1800}).png().toBuffer();
  const stats=await sharp(band).stats();
  const variation=Math.max(...stats.channels.slice(0,3).map(channel=>channel.stdev));
  assert(variation>12,label+' '+side+' edge contains approved decorations instead of an unused solid side mat');
  bands.push({side,variation:Number(variation.toFixed(2))});
 }
 return {width:metadata.width,height:metadata.height,decoratedEdges:bands};
}

// Examine the exported JPEG itself: corresponding halves must be matching
// keepsakes. JPEG block boundaries can differ slightly at the centre seam.
export async function assertMatchingStripJPEG(bytes,label){
 const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,1200);assert.equal(info.height,1800);
 let totalDifference=0,largeDifferences=0,samples=0;
 for(let y=0;y<1800;y++)for(let x=4;x<596;x++)for(let channel=0;channel<3;channel++){
  const left=(y*1200+x)*info.channels+channel,right=(y*1200+x+600)*info.channels+channel,difference=Math.abs(data[left]-data[right]);
  totalDifference+=difference;largeDifferences+=Number(difference>12);samples++;
 }
 const meanDifference=totalDifference/samples,largeDifferenceFraction=largeDifferences/samples;
 assert(meanDifference<3&&largeDifferenceFraction<.03,label+' exports two matching complete strips, including artwork, text and photographs');
 return {matchingCopies:2,meanPixelDifference:Number(meanDifference.toFixed(3)),differentPixelFraction:Number(largeDifferenceFraction.toFixed(4))};
}

export async function assertUploadedArtworkEdges(bytes,expectedHex,label){
 const rgb=expectedHex.match(/[0-9a-f]{2}/gi).map(value=>parseInt(value,16)),samples=[];
 // The fixture artwork deliberately has a different aspect ratio from paper.
 // Both left and right must show that artwork rather than the builder fallback.
 for(const [side,left]of [['left',16],['right',1176]]){
  const patch=await sharp(bytes).extract({left,top:900,width:8,height:8}).png().toBuffer();
  const stats=await sharp(patch).stats();
  const actual=stats.channels.slice(0,3).map(channel=>channel.mean);
  for(let channel=0;channel<3;channel++)assert(Math.abs(actual[channel]-rgb[channel])<5,
   label+' '+side+' edge is filled with uploaded artwork without a blank contain margin');
  samples.push({side,rgb:actual.map(value=>Math.round(value))});
 }
 return {artworkAtBothEdges:samples};
}

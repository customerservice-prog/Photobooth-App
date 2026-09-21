// Native SVG filter primitives survive WebKit's SVG-to-JPEG export, unlike CSS image filters.
const finishes=new Map([
 ['brightness(1.08) contrast(.96) saturate(.88)','glam'],
 ['grayscale(1) contrast(1.08) brightness(1.04)','bw'],
 ['sepia(.18) saturate(.92) brightness(1.03)','warm']
]);
function transfer(slope,intercept=0){return `<feComponentTransfer><feFuncR type="linear" slope="${slope}" intercept="${intercept}"/><feFuncG type="linear" slope="${slope}" intercept="${intercept}"/><feFuncB type="linear" slope="${slope}" intercept="${intercept}"/></feComponentTransfer>`;}
const saturate=value=>`<feColorMatrix type="saturate" values="${value}"/>`;
const graphs={
 glam:transfer(1.08)+transfer(.96,.02)+saturate(.88),
 bw:saturate(0)+transfer(1.08,-.04)+transfer(1.04),
 warm:'<feColorMatrix type="matrix" values="0.89074 0.13842 0.03402 0 0 0.06282 0.94348 0.03024 0 0 0.04896 0.09612 0.84358 0 0 0 0 0 1 0"/>'+saturate(.92)+transfer(1.03)
};
export function applySvgPhotoFinish(svg,requested,id='card'){
 const finish=finishes.get(requested)||'none';
 const safeId=String(id).replace(/[^a-zA-Z0-9_-]/g,'')||'card',filterId=safeId+'-photo-finish';
 const image=/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g;
 const result=svg.replace(image,tag=>{
  const clean=tag.replace(/ style="filter:[^"]*"/g,'');
  return clean.replace(/\/>$/,` data-photo-finish="${finish}"${finish==='none'?'':` filter="url(#${filterId})"`}/>`);
 });
 if(finish==='none')return result;
 const defs=`<defs><filter id="${filterId}" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB">${graphs[finish]}</filter></defs>`;
 return result.replace(/(<svg\b[^>]*>)/,'$1'+defs);
}

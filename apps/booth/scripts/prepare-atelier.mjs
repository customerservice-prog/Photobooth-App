// Build-time asset preparation only. Guest browsers make no third-party artwork/font requests.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import sharp from 'sharp';
import opentype from 'opentype.js';
const out='proof-output';await mkdir(out,{recursive:true});await mkdir('app/lib/generated',{recursive:true});
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`Asset fetch ${r.status}: ${url}`);return Buffer.from(await r.arrayBuffer());}
// Original museum artwork is Open Access / CC0, NOT a purchased template or its preview.
const roseUrl='https://piction.clevelandart.org/cma/ump.di?e=AD8F36EB09A4EDB4B74E18F1D3A6AD490BD2041E2AAE9737BFC4074C5EF69D39&s=24247294&se=116628280&v=3&f=1943.137_o5.jpg';
let rose;
try{rose=await get('https://openaccess-cdn.clevelandart.org/1943.137/1943.137_web.jpg');await sharp(rose).metadata();}catch{rose=await get(roseUrl);}
await writeFile(out+'/rose-source.jpg',rose);
// Limit artwork to the upper botanical portion; remove page/lettering, preserving painted edges.
const {width,height}=await sharp(rose).metadata();
const {data,info}=await sharp(rose).extract({left:Math.round(width*.09),top:Math.round(height*.07),width:Math.round(width*.82),height:Math.round(height*.67)}).resize({width:760}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];const mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx-mn,light=(r+g+b)/3;let a=255;if(light>177&&sat<46)a=Math.max(0,Math.min(255,(201-light)*11+(sat-25)*5));if(light>215&&sat<45)a=0;data[i+3]=a;}
const rosePng=await sharp(data,{raw:info}).trim({background:'#00000000',threshold:8}).png({palette:true,quality:95}).toBuffer();await writeFile(out+'/rose-cutout.png',rosePng);
const fonts={};
for(const [name,folder,file]of [['script','greatvibes','GreatVibes-Regular.ttf'],['serif','cormorantgaramond','CormorantGaramond[wght].ttf'],['sans','montserrat','Montserrat[wght].ttf']]){
 const root=`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/`;
 const bytes=await get(root+encodeURIComponent(file));const font=opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const chars=Array.from({length:224},(_,i)=>String.fromCharCode(i+32)).concat(['Œ','œ','Š','š','Ž','ž','Ÿ','’','‘','“','”','–','—','·']);const glyphs={};
 for(const ch of chars){const glyph=font.charToGlyph(ch);if(!glyph.index&&ch!==' ')continue;const p=glyph.getPath(0,0,1000);glyphs[ch]={path:p.toPathData(1),advance:glyph.advanceWidth/font.unitsPerEm*1000};}
 const kern={};for(const a of chars)for(const b of chars){const k=font.getKerningValue(font.charToGlyph(a),font.charToGlyph(b));if(k)kern[a+b]=Math.round(k/font.unitsPerEm*1000);}
 fonts[name]={glyphs,kern};const license=(await get(root+'OFL.txt')).toString();await writeFile(out+'/'+name+'-LICENSE.txt',license);
}
await writeFile('app/lib/generated/atelier-assets.mjs','// Font outlines: SIL OFL 1.1; source notices in docs/atelier-licenses. Museum rose: CMA Open Access 1943.137.\nexport const rose='+JSON.stringify('data:image/png;base64,'+rosePng.toString('base64'))+';\nexport const faces='+JSON.stringify(fonts)+';\n');
await mkdir('docs/atelier-licenses',{recursive:true});for(const name of Object.keys(fonts))await writeFile('docs/atelier-licenses/'+name+'-OFL.txt',await readFile(out+'/'+name+'-LICENSE.txt'));
console.log('Prepared CC0 botanical art and three OFL typeface outline sets; no guest data used.');

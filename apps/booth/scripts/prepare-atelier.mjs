// Build-time preparation. No artwork/font network request is made on a guest device.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import opentype from 'opentype.js';
const version='atelier-assets-3',file='app/lib/generated/atelier-assets.mjs',out='proof-output';
try{if((await readFile(file,'utf8')).startsWith('// '+version)){console.log('Atelier assets already prepared.');process.exit(0);}}catch{}
await mkdir(out,{recursive:true});await mkdir('app/lib/generated',{recursive:true});
const hashes={};async function get(url){let last;for(let n=0;n<3;n++){try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error(`Asset fetch ${r.status}: ${url}`);const bytes=Buffer.from(await r.arrayBuffer());hashes[url]=createHash('sha256').update(bytes).digest('hex');return bytes;}catch(e){last=e;if(n<2)await new Promise(r=>setTimeout(r,1000));}}throw last;}
const source='https://openaccess-cdn.clevelandart.org/1943.137/1943.137_web.jpg';
const alternative='https://piction.clevelandart.org/cma/ump.di?e=AD8F36EB09A4EDB4B74E18F1D3A6AD490BD2041E2AAE9737BFC4074C5EF69D39&s=24247294&se=116628280&v=3&f=1943.137_o5.jpg';
let original;try{original=await get(source);await sharp(original).metadata();}catch{original=await get(alternative);}
await writeFile(out+'/rose-source.jpg',original);const {width,height}=await sharp(original).metadata();
const {data,info}=await sharp(original).extract({left:Math.round(width*.09),top:Math.round(height*.07),width:Math.round(width*.82),height:Math.round(height*.75)}).resize({width:760}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const count=info.width*info.height,mask=new Uint8Array(count);
for(let p=0;p<count;p++){const i=p*4,r=data[i],g=data[i+1],b=data[i+2],light=(r+g+b)/3;let score=Math.max((g-r)*2.8+45,(r-g)*2.2-20,(165-light)*5);if(r>=g&&g>=b&&r-g<35&&light>167)score=0;data[i+3]=Math.max(0,Math.min(255,score*255/70));mask[p]=score>18?1:0;}
const seen=new Uint8Array(count),queue=new Int32Array(count);
for(let start=0;start<count;start++){if(!mask[start]||seen[start])continue;let read=0,total=1;queue[0]=start;seen[start]=1;while(read<total){const p=queue[read++],x=p%info.width;for(const n of [p-info.width,p+info.width,x?p-1:-1,x<info.width-1?p+1:-1])if(n>=0&&n<count&&mask[n]&&!seen[n]){seen[n]=1;queue[total++]=n;}}if(total<90)for(let k=0;k<total;k++)data[queue[k]*4+3]=0;}
const png=await sharp(data,{raw:info}).trim({background:'#00000000',threshold:8}).png({palette:true,quality:95}).toBuffer();await writeFile(out+'/rose-cutout.png',png);
const faces={},notices={rose:'Rosa Centifolia Anglica Rubra, Henri Joseph Redouté, 1817–1824. Cleveland Museum of Art, accession 1943.137. Open Access / CC0. Cropped and paper background removed for these original layouts. https://www.clevelandart.org/art/1943.137'};
for(const [name,folder,filename]of [['script','greatvibes','GreatVibes-Regular.ttf'],['serif','cormorantgaramond','CormorantGaramond[wght].ttf'],['sans','montserrat','Montserrat-Regular.ttf']]){
 const root=`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/`;
 // The static Regular cut avoids the variable Montserrat font's very thin default axis instance.
 const fontUrl=name==='sans'?'https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Regular.ttf':root+encodeURIComponent(filename);
 const bytes=await get(fontUrl),font=opentype.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const chars=Array.from({length:224},(_,i)=>String.fromCharCode(i+32)).concat(['Œ','œ','Š','š','Ž','ž','Ÿ','’','‘','“','”','–','—','·']),glyphs={};
 for(const ch of chars){const glyph=font.charToGlyph(ch);if(!glyph.index&&ch!==' ')continue;const p=glyph.getPath(0,0,1000);glyphs[ch]={path:p.toPathData(1),advance:glyph.advanceWidth/font.unitsPerEm*1000,box:p.getBoundingBox()};}
 const kern={};for(const a of chars)for(const b of chars){const k=font.getKerningValue(font.charToGlyph(a),font.charToGlyph(b));if(k)kern[a+b]=Math.round(k/font.unitsPerEm*1000);}
 faces[name]={glyphs,kern};notices[name]=(await get(root+'OFL.txt')).toString();await writeFile(out+'/'+name+'-LICENSE.txt',notices[name]);
}
await writeFile(file,'// '+version+'\n// Original template artwork. Typeface outline adaptations retain SIL OFL 1.1 notices below.\nexport const rose='+JSON.stringify('data:image/png;base64,'+png.toString('base64'))+';\nexport const faces='+JSON.stringify(faces)+';\nexport const assetNotices='+JSON.stringify(notices)+';\n');
await writeFile(out+'/asset-integrity.json',JSON.stringify(hashes,null,2));console.log('Atelier prepared: CC0 botanical and outlined OFL display typography.');

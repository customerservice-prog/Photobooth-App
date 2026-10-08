// No external ZIP service and no untrusted filenames. Stored JPEGs are already
// compressed, so ZIP STORED avoids recompression and keeps output byte-exact.
const table=Uint32Array.from({length:256},(_,idx)=>{let n=idx;for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const encode=v=>new TextEncoder().encode(v);
const u32=(view,index,value)=>view.setUint32(index,value>>>0,true);
const u16=(view,index,value)=>view.setUint16(index,value,true);
export const GALLERY_PART_SIZE=50;
export const GALLERY_PART_MAX_BYTES=110*1024*1024;
export function safeGalleryName(name='event'){
 return (String(name).normalize('NFKD').replace(/[^a-z0-9-]+/gi,'-').replace(/^-|-$/g,'').slice(0,55)||'event');
}
export function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zipJpegs(files){
 if(!Array.isArray(files)||files.length<1||files.length>GALLERY_PART_SIZE+1)throw new Error('Choose up to 50 finished photographs.');
 let size=0,offset=0,centralLength=0;
 const pieces=[],center=[];
 for(const f of files){
  const name=String(f.name||''),data=f.data instanceof Uint8Array?f.data:new Uint8Array(f.data||[]);
  if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.startsWith('/')||name.includes('..')||!data.length)
   throw new Error('Invalid file in the event gallery.');
  if(!name.endsWith('.jpg')&&!name.endsWith('.json'))throw new Error('Only event JPEGs and the manifest can be exported.');
  size+=data.length;
  if(size>GALLERY_PART_MAX_BYTES)throw new Error('This part is too large. Export the local iPad ZIP or request smaller gallery parts.');
  const n=encode(name),hash=crc32(data);
  if(n.length>65535)throw new Error('Filename too long.');
  const local=new Uint8Array(30+n.length),l=new DataView(local.buffer);
  u32(l,0,0x04034b50);u16(l,4,20);u32(l,14,hash);u32(l,18,data.length);u32(l,22,data.length);u16(l,26,n.length);local.set(n,30);
  const c=new Uint8Array(46+n.length),v=new DataView(c.buffer);
  u32(v,0,0x02014b50);u16(v,4,20);u16(v,6,20);u32(v,16,hash);u32(v,20,data.length);u32(v,24,data.length);u16(v,28,n.length);u32(v,42,offset);c.set(n,46);
  center.push(c);centralLength+=c.byteLength;pieces.push(local,data);offset+=local.byteLength+data.byteLength;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);
 u32(e,0,0x06054b50);u16(e,8,files.length);u16(e,10,files.length);u32(e,12,centralLength);u32(e,16,offset);
 return new Blob([...pieces,...center,end],{type:'application/zip'});
}

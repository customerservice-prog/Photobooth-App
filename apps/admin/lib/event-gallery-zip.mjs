// No external ZIP service and no untrusted filenames. Stored JPEGs are already
// compressed, so ZIP STORED avoids recompression and keeps output byte-exact.
const table=Uint32Array.from({length:256},(_,idx)=>{let n=idx;for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const encode=v=>new TextEncoder().encode(v);
const u32=(view,index,value)=>view.setUint32(index,value>>>0,true);
const u16=(view,index,value)=>view.setUint16(index,value,true);
export const GALLERY_PART_SIZE=50;
export const GALLERY_PART_MAX_BYTES=110*1024*1024;
export const GALLERY_KINDS=Object.freeze(['pose-1','pose-2','pose-3','pose-4','collage','keepsake']);
export const GALLERY_PART_MAX_FILES=GALLERY_PART_SIZE*GALLERY_KINDS.length+1;
// Reserve room for the manifest and ZIP headers before returning image bytes.
export const GALLERY_IMAGE_MAX_BYTES=GALLERY_PART_MAX_BYTES-128*1024;
export function galleryPartSize(maxSessionBytes=0){
 const bytes=Number(maxSessionBytes);
 return bytes>0?Math.min(GALLERY_PART_SIZE,Math.max(1,Math.floor(GALLERY_IMAGE_MAX_BYTES/bytes))):GALLERY_PART_SIZE;
}
export function safeGalleryName(name='event'){
 return (String(name).normalize('NFKD').replace(/[^a-z0-9-]+/gi,'-').replace(/^-|-$/g,'').slice(0,55)||'event');
}
export function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zipJpegs(files){
 if(!Array.isArray(files)||files.length<1||files.length>GALLERY_PART_MAX_FILES)throw new Error('Choose up to 50 photo sessions per gallery part.');
 let size=0,offset=0,centralLength=0;
 const pieces=[],center=[],names=new Set();
 for(const f of files){
  const name=String(f.name||''),data=f.data instanceof Uint8Array?f.data:f.data instanceof ArrayBuffer?new Uint8Array(f.data):null;
  if(!/^[a-zA-Z0-9_./-]+$/.test(name)||name.startsWith('/')||name.includes('..')||name.includes('//')||!data?.length||names.has(name))
   throw new Error('Invalid file in the event gallery.');
  names.add(name);
  if(name!=='manifest.json'&&!name.endsWith('.jpg'))throw new Error('Only event JPEGs and the manifest can be exported.');
  if(name.endsWith('.jpg')&&(data.length<4||data[0]!==255||data[1]!==216||data.at(-2)!==255||data.at(-1)!==217))throw new Error('An uploaded photo is not a valid JPEG. The saved originals have not been changed.');
  // Include both file headers, filenames and the final directory record.
  size+=data.length+76+encode(name).length*2;
  if(names.size===1)size+=22;
  if(size>GALLERY_PART_MAX_BYTES)throw new Error('This gallery part is too large for a safe download. The saved originals have not been changed.');
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

export function galleryFiles(rows,{eventName,eventId,part,partSize=GALLERY_PART_SIZE,exportedAt=new Date().toISOString()}){
 partSize=Number(partSize);
 if(!Array.isArray(rows)||!Number.isInteger(part)||part<1||!Number.isInteger(partSize)||partSize<1||partSize>GALLERY_PART_SIZE)throw new Error('Invalid event gallery part.');
 const sessions=[],byCapture=new Map(),images=[];
 for(const row of rows){
  const capture=String(row.capture_id||''),kind=String(row.kind||'');
  if(!/^[A-Za-z0-9_-]{3,100}$/.test(capture)||!GALLERY_KINDS.includes(kind))throw new Error('Invalid photo in the event gallery.');
  let session=byCapture.get(capture);
  if(!session){
   if(sessions.length>=partSize)throw new Error('Too many photo sessions in this gallery part.');
   const number=(part-1)*partSize+sessions.length+1;
   session={captureId:capture,folder:'session-'+String(number).padStart(4,'0'),images:[]};
   byCapture.set(capture,session);sessions.push(session);
  }
  if(session.images.some(image=>image.type===kind))throw new Error('Duplicate photo in the event gallery.');
  const file=session.folder+'/'+kind+'.jpg';
  const data=row.image instanceof Uint8Array?row.image:row.image instanceof ArrayBuffer?new Uint8Array(row.image):null;
  if(!data?.length)throw new Error('An uploaded session is too large or has an unavailable photo. The saved originals have not been changed.');
  session.images.push({file,type:kind});images.push({name:file,data});
 }
 if(!images.length)throw new Error('No uploaded photos in this gallery part.');
 const manifest={version:2,event:eventName,eventId,exportedAt,part,partSize,sessionCount:sessions.length,
  originalPhotoCount:rows.filter(row=>row.kind.startsWith('pose-')).length,
  finishedPhotoCount:rows.filter(row=>['keepsake','collage'].includes(row.kind)).length,
  fileCount:images.length,sessions,
  note:'Contains every available uploaded original pose, collage and finished keepsake in these sessions. Session folders follow first upload time, then capture ID. Photos still queued on an offline iPad are not in this download. Reconnect that event iPad and confirm its uploads have finished before delivering the final gallery. Online copies expire after 30 days.'};
 return [{name:'manifest.json',data:encode(JSON.stringify(manifest,null,2))},...images];
}

// Limit sessions before joining image rows so a pose-only session is never lost
// and the same session's originals and finished artwork stay in one part.
export async function readEventGalleryPart(db,eventId,part){
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(String(eventId||''))||!Number.isInteger(part)||part<1||part>1000)throw new Error('Invalid event or gallery part.');
 return db.$queryRaw`
  WITH session_sizes AS (
   SELECT capture_id,MIN(created_at) AS first_uploaded_at,SUM(octet_length(image)) AS session_bytes
   FROM booth_backup_v1.images
   WHERE event_id=${eventId} AND expires_at>now() AND kind IN ('pose-1','pose-2','pose-3','pose-4','collage','keepsake')
   GROUP BY capture_id
  ), part_settings AS (
   SELECT LEAST(${GALLERY_PART_SIZE},GREATEST(1,FLOOR(${GALLERY_IMAGE_MAX_BYTES}::numeric/NULLIF(MAX(session_bytes),0))))::int AS part_size FROM session_sizes
  ), selected_sessions AS (
   SELECT capture_id,first_uploaded_at FROM session_sizes ORDER BY first_uploaded_at ASC,capture_id ASC
   LIMIT (SELECT part_size FROM part_settings) OFFSET (${part-1}*(SELECT part_size FROM part_settings))
  ), available AS (
   SELECT images.capture_id,images.kind,images.image,selected_sessions.first_uploaded_at,
    SUM(octet_length(images.image)) OVER () AS total_bytes
   FROM booth_backup_v1.images AS images
   JOIN selected_sessions ON selected_sessions.capture_id=images.capture_id
   WHERE images.event_id=${eventId} AND images.expires_at>now() AND images.kind IN ('pose-1','pose-2','pose-3','pose-4','collage','keepsake')
  )
  SELECT capture_id,kind,part_settings.part_size,CASE WHEN total_bytes<=${GALLERY_IMAGE_MAX_BYTES} THEN image ELSE NULL END AS image
  FROM available CROSS JOIN part_settings ORDER BY first_uploaded_at ASC,capture_id ASC,
   CASE kind WHEN 'pose-1' THEN 1 WHEN 'pose-2' THEN 2 WHEN 'pose-3' THEN 3 WHEN 'pose-4' THEN 4 WHEN 'collage' THEN 5 ELSE 6 END ASC`;
}

import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {workspace} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {PRINT_LEDGER_PREFIX} from '../app/lib/print-ledger.mjs';
import {crc32} from '../app/lib/event-photo-archive.mjs';

// Render the actual staff closeout component with its actual storage, upload
// coordinator and cleanup helpers. Only the HTTP backend is an isolated local
// fixture; no customer booking, production counter, printer or recipient exists.
const require=createRequire(import.meta.url),{transformSync}=require('next/dist/build/swc');
const read=path=>readFile(new URL('../app/'+path,import.meta.url),'utf8');
const strip=source=>source.replace(/^import .*;\n/gm,'').replace(/\bexport default /g,'').replace(/\bexport /g,'');
const [archiveSource,backupSource,lifecycleSource,componentSource,activeSource,react,reactDOM]=await Promise.all([
 read('lib/event-photo-archive.mjs'),read('lib/backup-sync.mjs'),read('lib/event-lifecycle.mjs'),read('components/StaffEventCloseout.js'),read('lib/active-event.mjs'),
 readFile(join(dirname(require.resolve('react/package.json')),'umd/react.development.js'),'utf8'),
 readFile(join(dirname(require.resolve('react-dom/package.json')),'umd/react-dom.development.js'),'utf8')
]);
const component=transformSync(strip(componentSource),{jsc:{parser:{syntax:'ecmascript',jsx:true},target:'es2022',transform:{react:{runtime:'classic'}}}}).code;
const config={scope:workspace('?booth_event=closeout-proof-event'),other:workspace('?booth_event=closeout-proof-next-event'),activeKey:ACTIVE_EVENT_KEY,ledgerPrefix:PRINT_LEDGER_PREFIX};
const js=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const script=`
const fixture=${js(config)};
const archive=new Function(${js(strip(archiveSource)+'\nreturn {savePose,saveCapture,saveKeepsake,listCaptures,archiveCount,exportPhotos,downloadBlob,deleteArchivedEvent,crc32};')})();
const backup=new Function('listCaptures','crc32',${js(strip(backupSource)+'\nreturn {tokenKey,backupStatusKey,readBackupStatus,backupStatusLabel,BACKUP_STATUS_EVENT,syncEventPhotos,eventBackupProof};')})(archive.listCaptures,archive.crc32);
const lifecycle=new Function('ACTIVE_EVENT_KEY','PRINT_LEDGER_PREFIX','tokenKey','backupStatusKey',${js(strip(lifecycleSource)+'\nreturn {canCloseImportedEvent,clearClosedEventSettings,EVENT_CLOSE_CONFIRMATION,galleryZipFilename};')})(fixture.activeKey,fixture.ledgerPrefix,backup.tokenKey,backup.backupStatusKey);
window.__closeout={archive,backup,lifecycle,fixture};
const componentNames=['React','useEffect','useState',...Object.keys(archive),...Object.keys(backup),...Object.keys(lifecycle)];
const StaffEventCloseout=new Function(...componentNames,${js(component+'\nreturn StaffEventCloseout;')})(React,React.useEffect,React.useState,...Object.values(archive),...Object.values(backup),...Object.values(lifecycle));
window.__closeout.ready=(async()=>{
 const {scope,other}=fixture;
 const canvas=document.createElement('canvas');canvas.width=50;canvas.height=40;const ctx=canvas.getContext('2d');
 const image=n=>{ctx.fillStyle=['#b8454d','#428577','#4767a5','#ac7139','#825897','#375359'][n%6];ctx.fillRect(0,0,50,40);ctx.fillStyle='#fff';ctx.font='18px sans-serif';ctx.fillText(String(n),12,25);return canvas.toDataURL('image/jpeg');};
 const pictures=Array.from({length:14},(_,i)=>image(i));window.__closeout.pictures=pictures;
 const jpeg=data=>new Blob([Uint8Array.from(atob(data.split(',')[1]),character=>character.charCodeAt(0))],{type:'image/jpeg'});window.__closeout.jpeg=jpeg;
 for(const [key,value]of Object.entries({[scope.config]:JSON.stringify({eventId:scope.id,adminHandoff:{syncTicket:'isolated-closeout-proof'}}),[scope.previous]:'previous settings',[scope.usage]:'17',[scope.photos]:'old gallery pointer',[fixture.ledgerPrefix+scope.id+'-transfer']:'current print ledger',[other.config]:JSON.stringify({eventId:other.id,title:'Next customer'}),[other.previous]:'next previous',[other.usage]:'23',[other.photos]:'next gallery pointer',[fixture.ledgerPrefix+other.id+'-transfer']:'next print ledger',[backup.tokenKey(other.id)]:'next upload token',[backup.backupStatusKey(other.id)]:'next progress',['friendly-booth-uploaded-v1-'+other.archive+'-next-pose-1']:'next upload acknowledgment',[fixture.activeKey]:scope.id,'friendly-booth-assigned-event-v1':other.id,'friendly-booth-screen-awake-v1':'on','unrelated-setting':'keep'}))localStorage.setItem(key,value);
 await archive.saveCapture(scope.archive,'one',pictures[1],[pictures[0]],{title:'Closeout fixture'});
 await archive.saveKeepsake(scope.archive,'one',jpeg(pictures[2]));
 await archive.saveCapture(scope.archive,'four',pictures[7],pictures.slice(3,7),{title:'Closeout fixture'});
 await archive.saveKeepsake(scope.archive,'four',jpeg(pictures[8]));
 await archive.savePose(scope.archive,'interrupted',1,pictures[9],{title:'Closeout fixture'});
 await archive.saveCapture(other.archive,'next',pictures[11],[pictures[10]],{title:'Next customer'});
 await archive.saveKeepsake(other.archive,'next',jpeg(pictures[12]));
 // A remembered ready screen must never substitute for scanning current files.
 localStorage.setItem(backup.backupStatusKey(scope.id),JSON.stringify({eventId:scope.id,state:'ready',total:0,saved:0,pending:0}));
 window.__closeout.otherStorage=Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes(other.id)||k==='friendly-booth-screen-awake-v1'||k==='unrelated-setting').map(k=>[k,localStorage.getItem(k)]));
 ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(StaffEventCloseout,{scope,eventName:'Closeout fixture'}));
})();
`;
const out='event-closeout-proof',results=[];
const engines=[['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.CLOSEOUT_PROOF_BROWSERS||process.env.CLOSEOUT_PROOF_BROWSERS.split(',').includes(name));
assert(engines.length,'Choose chromium or webkit');
await mkdir(out,{recursive:true});
async function archiveRows(page,scope){
 return page.evaluate(async({source,scope})=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();
  const bytes=async value=>value?Array.from(new Uint8Array(await value.arrayBuffer())):null;
  return Promise.all((await api.listCaptures(scope)).map(async row=>({id:row.id,poses:await Promise.all(row.poses.map(bytes)),collage:await bytes(row.collage),keepsake:await bytes(row.keepsake)})));
 },{source:archiveSource,scope});
}
function verifyZip(bytes,rows){
 const files=new Map();let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),name=bytes.subarray(offset+30,offset+30+nameLength).toString('utf8'),start=offset+30+nameLength+extra,data=bytes.subarray(start,start+size);
  assert.equal(crc32(data),bytes.readUInt32LE(offset+14),'ZIP CRC '+name);assert(!files.has(name),'ZIP filename is unique');files.set(name,data);offset=start+size;
 }
 const manifest=JSON.parse(files.get('manifest.json'));
 assert.equal(manifest.scope,config.scope.archive);assert.equal(manifest.sessions,rows.length);
 assert.equal(manifest.originalPhotos,rows.reduce((sum,row)=>sum+row.poses.length,0));
 assert.equal(manifest.interruptedSessions,rows.filter(row=>!row.collage).length);
 assert.equal(manifest.captureCollages,rows.filter(row=>row.collage).length);
 assert.equal(manifest.finishedKeepsakes,rows.filter(row=>row.keepsake).length);
 let expectedCount=1;
 rows.forEach((row,index)=>{
  const folder='session-'+String(index+1).padStart(4,'0')+'/';
  row.poses.forEach((bytes,index)=>{assert.deepEqual(files.get(folder+'pose-'+(index+1)+'.jpg'),Buffer.from(bytes),'Original ZIP JPEG retains exact captured bytes');expectedCount++;});
  for(const [kind,filename]of [['collage','collage.jpg'],['keepsake','keepsake.jpg']]){
   if(row[kind]){assert.deepEqual(files.get(folder+filename),Buffer.from(row[kind]),kind+' ZIP JPEG retains exact saved bytes');expectedCount++;}
  }
 });
 assert.equal(manifest.fileCount,expectedCount-1,'Manifest counts every original, collage and keepsake');
 assert.equal(manifest.fileCount,manifest.originalPhotos+manifest.captureCollages+manifest.finishedKeepsakes);
 assert.equal(files.size,expectedCount);return manifest;
}
for(const [name,engine]of engines){
 let uploadsAllowed=false;const saved=new Map(),posts=[],errors=[];
 const server=createServer(async(request,response)=>{
  const reply=(status,value)=>{response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value));};
  try{
   if(request.url==='/react.js'||request.url==='/react-dom.js'){response.writeHead(200,{'content-type':'application/javascript'});return response.end(request.url==='/react.js'?react:reactDOM);}
   if(request.method==='GET'){response.writeHead(200,{'content-type':'text/html'});return response.end(request.url==='/launch'?'<title>Next event selection</title>':'<!doctype html><title>Isolated event closeout</title><div id="root"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script>'+script+'</script>');}
   const chunks=[];for await(const chunk of request)chunks.push(chunk);const body=Buffer.concat(chunks);posts.push(request.url);
   if(request.url==='/api/backup/authorize'){assert.deepEqual(JSON.parse(body),{eventId:config.scope.id,syncTicket:'isolated-closeout-proof'});return reply(200,{token:'isolated-upload-token'});}
   assert.equal(request.url,'/api/backup/image');assert.equal(request.headers['x-booth-event'],config.scope.id);assert.equal(request.headers.authorization,'Bearer isolated-upload-token');
   if(!uploadsAllowed)return reply(503,{ok:false});
   saved.set(request.headers['x-booth-capture']+'/'+request.headers['x-booth-kind'],Buffer.from(body));return reply(200,{ok:true});
  }catch(error){errors.push(error.message);return reply(500,{error:'Fixture rejected request'});}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.CLOSEOUT_CHROMIUM_PATH?{executablePath:process.env.CLOSEOUT_CHROMIUM_PATH,args:['--no-sandbox']}: {})});
  const context=await browser.newContext({viewport:{width:1024,height:768},acceptDownloads:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
  await context.route('**/*',route=>{const url=new URL(route.request().url());return ['data:','blob:'].includes(url.protocol)||url.origin===origin?route.continue():route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);await page.evaluate(()=>window.__closeout.ready);
  const before=await archiveRows(page,config.scope.archive),nextBefore=await archiveRows(page,config.other.archive),storageBefore=await page.evaluate(()=>window.__closeout.otherStorage);
  assert.equal(before.length,3);assert.equal(nextBefore.length,1);
  await page.getByTestId('staff-finish-event-fold').locator('summary').click();
  const verified=page.getByRole('checkbox'),remove=page.getByTestId('staff-remove-event');assert(await verified.isDisabled());assert(await remove.isDisabled());
  async function exportZip(label){const [download]=await Promise.all([page.waitForEvent('download'),page.getByTestId('staff-export-gallery').click()]);assert.equal(download.suggestedFilename(),'Closeout-fixture-all-digital-photos.zip');const path=out+'/'+name+'-'+label+'.zip';await download.saveAs(path);const rows=await archiveRows(page,config.scope.archive);const manifest=verifyZip(await readFile(path),rows);await page.getByTestId('staff-export-result').waitFor();return {rows,manifest};}
  const first=await exportZip('first');assert(await remove.isDisabled());await verified.check();await page.getByTestId('staff-close-event-confirm').fill('CLOSE EVENT');
  await remove.click();await page.getByRole('status').filter({hasText:/Keep this event on the iPad/}).waitFor();
  assert.deepEqual(await archiveRows(page,config.scope.archive),before,'Pending online files block deletion despite an old ready status');assert.equal(saved.size,0);assert.equal(page.url(),origin+'/');
  uploadsAllowed=true;
  await page.evaluate(async()=>{const {archive,fixture,pictures,jpeg}=window.__closeout;await archive.saveKeepsake(fixture.scope.archive,'one',jpeg(pictures[13]));});
  await remove.click();await page.getByRole('status').filter({hasText:/Event photos changed after the ZIP export/}).waitFor();
  const latest=await archiveRows(page,config.scope.archive);assert.equal(latest.length,3);assert.equal(saved.size,10,'Fresh backup contains all originals, collages and finished designs');assert.equal(page.url(),origin+'/','A same-count changed finished image blocks cleanup until re-export');
  const second=await exportZip('updated');assert.equal(second.manifest.originalPhotos,6);assert.equal(second.manifest.finishedKeepsakes,2);assert.equal(second.manifest.interruptedSessions,1);assert(await remove.isDisabled(),'New export requires fresh staff verification');await verified.check();
  await Promise.all([page.waitForURL(origin+'/launch'),remove.click()]);
  assert.equal((await archiveRows(page,config.scope.archive)).length,0);assert.deepEqual(await archiveRows(page,config.other.archive),nextBefore,'Other event archive retains exact bytes');
  const after=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)])));
  for(const [key,value]of Object.entries(storageBefore))assert.equal(after[key],value,'Other event and shared settings retained: '+key);
  for(const key of [config.scope.config,config.scope.previous,config.scope.usage,config.scope.photos,ACTIVE_EVENT_KEY,PRINT_LEDGER_PREFIX+config.scope.id+'-transfer'])assert.equal(after[key],undefined,'Closed event storage removed: '+key);
  const nextDestination=await page.evaluate(({source,id})=>{const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {assignActiveEvent,activeEventDestination};')();api.assignActiveEvent(localStorage,id);return api.activeEventDestination(localStorage);},{source:activeSource,id:config.other.id});
  assert.equal(nextDestination,config.other.home,'Preserved next booking can be selected without reloading its design');
  for(const row of second.rows){for(const [index,bytes]of row.poses.entries())assert.deepEqual(saved.get(row.id+'/pose-'+(index+1)),Buffer.from(bytes),'HTTP original bytes match local archive');for(const kind of ['collage','keepsake'])if(row[kind])assert.deepEqual(saved.get(row.id+'/'+kind),Buffer.from(row[kind]),'HTTP finished bytes match local archive');}
  assert.deepEqual(errors,[]);results.push({engine:name,passed:true,originals:6,finishedDesigns:2,interruptedOriginals:1,onlineFiles:saved.size,exactZipJPEGBytes:true,pendingBackupBlocksDeletion:true,sameCountNewJPEGBlocksDeletion:true,verifiedExportRequired:true,onlySelectedEventRemoved:true,nextBookingAndPhotoBytesPreserved:true,returnedToEventSelection:true,fixture:'actual React component and actual storage/upload/cleanup helpers; isolated local HTTP backend'});
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
await writeFile(out+'/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

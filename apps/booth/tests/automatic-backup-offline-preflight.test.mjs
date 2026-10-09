import test from 'node:test';
import assert from 'node:assert/strict';
import {HTTP_OFFLINE_MODE,nativeOfflineFilesSupported,preflightOfflineBrowser} from '../scripts/automatic-backup-offline-preflight.mjs';

const readable={blobSVG:true,dataSVG:true,blobArrayBuffer:true,blobFileReader:true,canvasToBlob:true,canvasBlobArrayBuffer:true,canvasBlobFileReader:true};
function browserFixture(){
 const events=[],answers=[false,false];
 const page={on(){},goto:async url=>events.push(['document',url]),evaluate:async()=>answers.shift()};
 const context={newPage:async()=>page,setOffline:async value=>events.push(['nativeOffline',value]),close:async()=>events.push(['contextClosed'])};
 const browser={newContext:async()=>context,version:()=> 'fixture-version',close:async()=>events.push(['browserClosed'])};
 const api={launch:async()=>{events.push(['browserLaunched']);return browser;}};
 return {api,events,page};
}

test('native offline capability requires usable original and encoded image Blob readers',()=>{
 assert.equal(nativeOfflineFilesSupported(readable),true);
 assert.equal(nativeOfflineFilesSupported({...readable,blobSVG:false}),true,'working data SVG can use the real local export fallback');
 for(const key of ['blobArrayBuffer','blobFileReader','canvasToBlob','canvasBlobArrayBuffer','canvasBlobFileReader'])assert.equal(nativeOfflineFilesSupported({...readable,[key]:false}),false,key);
 assert.equal(nativeOfflineFilesSupported({...readable,blobSVG:false,dataSVG:false}),false);
});
test('preflight closes its separate browser before selecting the application outage mode',async()=>{
 for(const [probe,mode] of [[readable,'context.setOffline'],[{...readable,blobArrayBuffer:false},HTTP_OFFLINE_MODE]]){
  const fixture=browserFixture();
  const result=await preflightOfflineBrowser(fixture.api,'webkit','http://127.0.0.1:3000',async page=>{assert.equal(page,fixture.page);fixture.events.push(['localProbe']);return probe;});
  assert.equal(result.offlineMode,mode);assert.deepEqual(result.offlineImageProbe,probe);
  assert.equal(result.httpRequestsBlocked,true);assert.equal(result.offlineSignal,true);
  assert.deepEqual(fixture.events,[['browserLaunched'],['document','http://127.0.0.1:3000/api/app-version'],['nativeOffline',true],['localProbe'],['contextClosed'],['browserClosed']]);
 }
});
test('failed preflight still closes its isolated browser and never returns a safe mode',async()=>{
 const fixture=browserFixture();
 await assert.rejects(preflightOfflineBrowser(fixture.api,'webkit','http://127.0.0.1:3000',async()=>{throw new Error('probe failed');}),/probe failed/);
 assert.deepEqual(fixture.events.slice(-2),[['contextClosed'],['browserClosed']]);
});

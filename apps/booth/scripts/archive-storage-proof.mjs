import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const source=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Photo storage test</title>');});
await new Promise(r=>server.listen(3199,'127.0.0.1',r));
const results=[];let failed=false;
try{for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:3199');
 const result=await page.evaluate(async source=>{
  const events=[];window.addEventListener('unhandledrejection',e=>events.push({type:'rejection',name:e.reason?.name,message:e.reason?.message}));
  // Capture the request's real error before its transaction has aborted.
  const originalOpen=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{const req=originalOpen(...args);req.addEventListener('success',()=>{req.result.addEventListener('error',e=>events.push({type:'idb-error',name:e.target?.error?.name,message:e.target?.error?.message,source:e.target?.source?.name}));});return req;};
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {saveCapture,saveKeepsake,listCaptures,archiveCount,exportPhotos,deleteArchivedEvent};')();
  const stages=[];async function step(name,job){try{const result=await job();stages.push({name,ok:true});return result;}catch(e){stages.push({name,ok:false,error:e.message,type:e.name});throw e;}}
  try{
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#334455';ctx.fillRect(0,0,32,32);const photo=canvas.toDataURL('image/jpeg');
   for(let i=0;i<23;i++)await step('save-capture-'+i,()=>api.saveCapture('retention','id-'+i,photo,[photo,photo,photo,photo],{title:'Synthetic test'}));
   await step('save-second-scope',()=>api.saveCapture('separate','other',photo,[photo,photo,photo,photo],{}));
   const records=await step('list-all-records',()=>api.listCaptures('retention'));
   await step('read-first-pose-bytes',()=>records[0].poses[0].arrayBuffer());
   await step('save-final-keepsake',()=>api.saveKeepsake('retention','id-0',records[0].collage));
   const count=await step('count-scope',()=>api.archiveCount('retention'));
   const exported=await step('zip-all-records',()=>api.exportPhotos('retention'));
   if(exported.count!==23)throw Error('The exported ZIP must contain all 23 sessions.');
   // A stale count MUST abort deletion. Another event stays untouched.
   let rejected=false;
   try{await step('wrong-count-deletion-blocked',()=>api.deleteArchivedEvent('retention',22));}catch{rejected=true;}
   if(!rejected||await api.archiveCount('retention')!==23)throw Error('Stale export deleted the customer photo archive.');
   await step('explicit-event-only-deletion',()=>api.deleteArchivedEvent('retention',23));
   if(await api.archiveCount('retention')!==0||await api.archiveCount('separate')!==1)
    throw Error('Closing an event must remove only that one exported event.');
   return {ok:true,count,stages,events};
  }catch(e){return {ok:false,stages,events};}
 },source);
 results.push({engine:name,...result});if(!result.ok)failed=true;
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}
await mkdir('welcome-proof',{recursive:true});await writeFile('welcome-proof/archive-storage-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(failed)process.exitCode=1;

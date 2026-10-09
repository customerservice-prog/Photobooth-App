import assert from 'node:assert/strict';

export const HTTP_OFFLINE_MODE='all HTTP blocked with navigator offline signal';
export function nativeOfflineFilesSupported(probe){
 return Boolean(probe&&(probe.blobSVG||probe.dataSVG)&&probe.blobArrayBuffer&&probe.blobFileReader&&probe.canvasToBlob&&probe.canvasBlobArrayBuffer&&probe.canvasBlobFileReader);
}

// Probe the browser emulator without loading the application. The complete
// browser instance closes before its result lets the application browser start.
// Broken emulator Blob APIs therefore never affect captures or their archive.
export async function preflightOfflineBrowser(api,engine,base,probeLocalFiles){
 const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});
 let context;
 const diagnosticErrors=[];
 try{
  context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();
  page.on('pageerror',error=>diagnosticErrors.push(error.message));
  await page.goto(base+'/api/app-version',{waitUntil:'networkidle'});
  await context.setOffline(true);
  const offlineImageProbe=await probeLocalFiles(page);
  const httpAvailable=await page.evaluate(async()=>{try{await fetch('/api/app-version');return true;}catch{return false;}});
  const online=await page.evaluate(()=>navigator.onLine);
  assert.equal(httpAvailable,false,'native preflight blocks HTTP');
  assert.equal(online,false,'native preflight reports offline');
  return {isolation:'separate browser closed before application launch',browserVersion:browser.version(),offlineMode:nativeOfflineFilesSupported(offlineImageProbe)?'context.setOffline':HTTP_OFFLINE_MODE,offlineImageProbe,diagnosticErrors,httpRequestsBlocked:true,offlineSignal:true};
 }finally{
  try{await context?.close();}finally{await browser.close();}
 }
}

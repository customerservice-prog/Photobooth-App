// GET-only production checks. No guest configuration, photos or messages are written.
import {mkdir,writeFile} from 'node:fs/promises';
const base='https://photobooth-booth-production.up.railway.app',out='proof-output';await mkdir(out,{recursive:true});const report={versionExpected:'event-collections-v1',requests:[],messagesSent:0,completed:false};
for(const path of ['/api/template-catalog','/designs','/setup','/print-test']){
 try{const r=await fetch(base+path,{signal:AbortSignal.timeout(12000)}),text=await r.text();const result={path,status:r.status};if(path==='/api/template-catalog'){const d=JSON.parse(text);result.version=d.version;result.count=d.count;result.versionMatches=d.version===report.versionExpected;}report.requests.push(result);}catch(e){report.requests.push({path,error:e.message});}
}
report.completed=report.requests.every(r=>r.status===200)&&report.requests[0]?.versionMatches;await writeFile(out+'/live-http-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
if(!report.completed)process.exitCode=1;

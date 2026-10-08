// Browser print dialogs do not confirm physical Canon paper output.
// Retain a local audit of requests so authorized staff can restore failed jobs.
export const PRINT_LEDGER_PREFIX='friendly-booth-print-ledger-v1-';
const key=scope=>PRINT_LEDGER_PREFIX+scope.id+(scope.demo?'-demo':'')+(scope.imported?'-transfer':'');
export function listPrintRequests(storage,scope){
 try{
  const items=JSON.parse(storage.getItem(key(scope))||'[]');
  return Array.isArray(items)?items.filter(x=>x&&typeof x.id==='string'&&['requested','printed','failed'].includes(x.status)).slice(0,250):[];
 }catch{return [];}
}
export function logPrintRequest(storage,scope){
 const requests=listPrintRequests(storage,scope);
 const entry={id:crypto.randomUUID(),status:'requested',time:new Date().toISOString()};
 storage.setItem(key(scope),JSON.stringify([entry,...requests].slice(0,250)));
 return entry;
}
export function markPrintOutcome(storage,scope,id,outcome){
 if(!['printed','failed'].includes(outcome))throw new Error('Choose a print outcome.');
 const rows=listPrintRequests(storage,scope),item=rows.find(r=>r.id===id);
 if(!item||item.status!=='requested')throw new Error('This request is already resolved.');
 if(outcome==='failed'){
  const raw=storage.getItem(scope.usage);
  if(!/^\d+$/.test(raw||''))throw new Error('Cannot restore an unreadable print counter.');
  const previous=Number(raw);
  if(!Number.isSafeInteger(previous)||previous<1)throw new Error('There are no prints to restore.');
  storage.setItem(scope.usage,String(previous-1));
 }
 item.status=outcome;
 storage.setItem(key(scope),JSON.stringify(rows));
 return item;
}
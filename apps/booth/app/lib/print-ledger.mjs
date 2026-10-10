// Browser print dialogs do not confirm physical Canon paper output.
// Retain a local audit of requests so authorized staff can restore failed jobs.
export const PRINT_LEDGER_PREFIX='friendly-booth-print-ledger-v1-';
const key=scope=>PRINT_LEDGER_PREFIX+scope.id+(scope.demo?'-demo':'')+(scope.imported?'-transfer':'');
const save=(storage,scope,rows)=>storage.setItem(key(scope),JSON.stringify(rows));
function counter(storage,scope){
 const raw=storage.getItem(scope.usage);
 if(!/^\d+$/.test(raw||''))throw new Error('Cannot restore an unreadable print counter.');
 const value=Number(raw);
 if(!Number.isSafeInteger(value))throw new Error('Cannot restore an unreadable print counter.');
 return value;
}
export function listPrintRequests(storage,scope){
 try{
  const items=JSON.parse(storage.getItem(key(scope))||'[]');
  return Array.isArray(items)?items.filter(x=>x&&typeof x.id==='string'&&['requested','printed','failed'].includes(x.status)).slice(0,250):[];
 }catch{return [];}
}
export function logPrintRequest(storage,scope){
 const requests=recoverPrintRequests(storage,scope);
 const entry={id:crypto.randomUUID(),status:'requested',time:new Date().toISOString()};
 save(storage,scope,[entry,...requests].slice(0,250));
 return entry;
}
// localStorage cannot commit the counter and ledger in one write. Retain the
// exact before/after values until both writes finish, so retrying an interrupted
// refund never decrements the counter twice. Call this before a new print debit.
export function recoverPrintRequests(storage,scope){
 const rows=listPrintRequests(storage,scope);
 for(const item of rows){
  if(!Object.hasOwn(item,'pendingRefund'))continue;
  const refund=item.pendingRefund;
  if(item.status!=='requested'||!refund||refund.usage!==scope.usage||
   !Number.isSafeInteger(refund.before)||refund.before<1||refund.after!==refund.before-1){
   throw new Error('This interrupted print refund needs staff review.');
  }
  const used=counter(storage,scope);
  if(used===refund.before)storage.setItem(scope.usage,String(refund.after));
  else if(used!==refund.after)throw new Error('The print counter changed during an interrupted refund. Ask staff to review it.');
  item.status='failed';delete item.pendingRefund;
  save(storage,scope,rows);
 }
 return rows;
}
export function markPrintOutcome(storage,scope,id,outcome){
 if(!['printed','failed'].includes(outcome))throw new Error('Choose a print outcome.');
 const pending=listPrintRequests(storage,scope).find(r=>r.id===id)?.pendingRefund;
 const rows=recoverPrintRequests(storage,scope),item=rows.find(r=>r.id===id);
 if(pending&&outcome==='failed'&&item?.status==='failed')return item;
 if(!item||item.status!=='requested')throw new Error('This request is already resolved.');
 if(outcome==='failed'){
  const previous=counter(storage,scope);
  if(previous<1)throw new Error('There are no prints to restore.');
  item.pendingRefund={usage:scope.usage,before:previous,after:previous-1};
  save(storage,scope,rows);
  return recoverPrintRequests(storage,scope).find(r=>r.id===id);
 }
 item.status=outcome;
 save(storage,scope,rows);
 return item;
}

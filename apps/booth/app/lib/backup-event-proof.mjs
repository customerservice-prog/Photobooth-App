// The owner's existing event-scoped sync ticket is the proof that this iPad
// loaded an approved event. Only the admin service may validate that ticket;
// a public event ID or client-supplied event settings are never sufficient.
const adminOrigin='https://photobooth-app-production.up.railway.app';
const boothOrigin='https://photobooth-booth-production.up.railway.app';
const eventIdPattern=/^[A-Za-z0-9_-]{3,90}$/;
const ticketPattern=/^[A-Za-z0-9_-]{1,400}\.[A-Za-z0-9_-]{43}$/;
export function validEventBackupProof(eventId,syncTicket){
 return typeof eventId==='string'&&eventIdPattern.test(eventId)&&typeof syncTicket==='string'&&ticketPattern.test(syncTicket);
}
export async function verifyEventBackupProof(eventId,syncTicket,{fetch:request=globalThis.fetch,timeoutMs=8000}={}){
 if(!validEventBackupProof(eventId,syncTicket))return 'invalid';
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await request(adminOrigin+'/api/booth/sync/'+encodeURIComponent(eventId),{
   method:'GET',headers:{Authorization:'Bearer '+syncTicket,Origin:boothOrigin},
   credentials:'omit',cache:'no-store',redirect:'manual',signal:controller.signal
  });
  // Its 200 response follows signature, expiry, event-scope and existence
  // checks. No customer artwork or event details need to be read here.
  if(response.body)void response.body.cancel().catch(()=>{});
  if(response.status===200)return 'authorized';
  return [400,401,403,404].includes(response.status)?'invalid':'unavailable';
 }catch{return 'unavailable';}
 finally{clearTimeout(timer);}
}

export const ACTIVE_EVENT_KEY='friendly-booth-active-event-v1';
export function assignActiveEvent(storage,id){
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))throw new Error('Invalid event');
 storage.setItem(ACTIVE_EVENT_KEY,id);
}
export function activeEventDestination(storage){
 try{
  const id=storage.getItem(ACTIVE_EVENT_KEY)||'';
  if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))return null;
  const data=JSON.parse(storage.getItem('friendly-booth-transfer-v1-'+id+'-config')||'null');
  return data?.eventId===id?'/?booth_event='+encodeURIComponent(id):null;
 }catch{return null;}
}
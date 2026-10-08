// A *device-local* launch preference only. Never delete or migrate photos,
// print counters or event configuration when switching the launch preference.
export const ASSIGNED_EVENT_KEY='friendly-booth-assigned-event-v1';
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{3,90}$/.test(id);
export function assignedEventUrl(storage){
 try{
  const id=storage?.getItem(ASSIGNED_EVENT_KEY);
  if(!validId(id))return null;
  // Do not open an event until its exact local configuration exists.
  if(!storage.getItem('friendly-booth-transfer-v1-'+id+'-config'))return null;
  return '/?booth_event='+encodeURIComponent(id);
 }catch{return null;}
}
export function assignEvent(storage,id){
 if(!validId(id))throw new Error('Invalid event identifier.');
 if(!storage?.getItem('friendly-booth-transfer-v1-'+id+'-config'))
  throw new Error('Load and review this event before making it the iPad default.');
 storage.setItem(ASSIGNED_EVENT_KEY,id);
 return '/?booth_event='+encodeURIComponent(id);
}
export function unassignEvent(storage){storage?.removeItem(ASSIGNED_EVENT_KEY);}

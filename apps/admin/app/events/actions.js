'use server';
import {requireAdmin} from '../../lib/require-admin.mjs';
import {prisma} from '../../lib/prisma';
import {getDefaultOrganization} from '../../lib/org';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {dateTimeFields,nonnegativePrints,mergeExperience} from '../../lib/studio-experience.mjs';
const value=(form,key)=>String(form.get(key)??'').trim();
const optional=(form,key)=>value(form,key)||null;
function requireValue(form,key,label){const v=value(form,key);if(!v)throw new Error(label+' is required.');return v;}
function validEmail(v){if(v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw new Error('Enter a valid email address.');return v||null;}
function eventTimes(form){return dateTimeFields(requireValue(form,'date','Event date'),requireValue(form,'startTime','Start time'),requireValue(form,'endTime','End time'));}
export async function createEvent(form){
 await requireAdmin();
 const name=requireValue(form,'customerName','Customer name'),eventName=requireValue(form,'eventName','Event name');
 const times=eventTimes(form),org=await getDefaultOrganization();
 const email=validEmail(value(form,'customerEmail'));
 const created=await prisma.$transaction(async tx=>{
  const customer=await tx.customer.create({data:{organizationId:org.id,name,email,phone:optional(form,'customerPhone')}});
  return tx.event.create({data:{
   organizationId:org.id,customerId:customer.id,name:eventName,
   eventType:optional(form,'eventType'),...times,venueName:optional(form,'venueName'),
   venueAddress:optional(form,'venueAddress'),internalNotes:optional(form,'internalNotes'),
   captureMode:'PHOTO',numberOfPhotos:4,maxPrints:108,copiesPerPrint:1,
   printingEnabled:true,displayPrintButton:true,qrSharingEnabled:true,
   theme:mergeExperience({},new Map([['eventType',value(form,'eventType')]])),status:'NEEDS_SETUP'
  }});
 });
 revalidatePath('/dashboard');revalidatePath('/events');redirect('/events/'+created.id+'/edit');
}
export async function updateEvent(id,form){
 await requireAdmin();
 const eventName=requireValue(form,'eventName','Event name'),customerName=requireValue(form,'customerName','Customer name');
 const times=eventTimes(form),email=validEmail(value(form,'customerEmail'));
 const boothId=optional(form,'boothId'),templateId=optional(form,'templateId');
 const maxPrints=nonnegativePrints(value(form,'maxPrints'),108);
 const printingEnabled=value(form,'printingEnabled')!=='no';
 const qrSharingEnabled=value(form,'qrSharingEnabled')!=='no';
 const photos=Number(value(form,'numberOfPhotos'))===3?3:4;
 const venueName=optional(form,'venueName'),venueAddress=optional(form,'venueAddress');
 const current=await prisma.event.findUnique({where:{id},select:{customerId:true,theme:true,status:true}});
 if(!current)throw new Error('This event no longer exists. Return to Events and try again.');
 // Retain every unrelated JSON field and preserve event lifecycle states.
 // Validate the complete artwork before any customer or event write.
 const theme=mergeExperience(current.theme,form);
 const done=!!(customerName&&venueName&&venueAddress&&boothId&&(templateId||theme.boothExperience.approvedDesign));
 const status=['ACTIVE','COMPLETED','ARCHIVED','LOADED_TO_BOOTH'].includes(current.status)?current.status:done?'CONFIGURED':'NEEDS_SETUP';
 await prisma.$transaction(async tx=>{
  await tx.event.update({where:{id},data:{
   name:eventName,eventType:optional(form,'eventType'),...times,
   venueName,venueAddress,internalNotes:optional(form,'internalNotes'),
   boothId,templateId,numberOfPhotos:photos,maxPrints,
   copiesPerPrint:1,printingEnabled,displayPrintButton:printingEnabled,qrSharingEnabled,
   theme,status
  }});
  if(current.customerId)await tx.customer.update({where:{id:current.customerId},data:{name:customerName,email,phone:optional(form,'customerPhone')}});
 });
 revalidatePath('/dashboard');revalidatePath('/events');revalidatePath('/events/'+id);
 redirect('/events/'+id);
}
export async function completeEvent(id){
 await requireAdmin();
 const event=await prisma.event.findUnique({where:{id},select:{status:true}});
 if(!event)throw new Error('This event no longer exists.');
 if(event.status==='ARCHIVED')throw new Error('This event is archived. Reopening requires staff review.');
 if(event.status!=='COMPLETED')await prisma.event.update({where:{id},data:{status:'COMPLETED'}});
 revalidatePath('/events');revalidatePath('/events/'+id);
 redirect('/events/'+id);
}
export async function archiveEvent(id){
 await requireAdmin();
 const event=await prisma.event.findUnique({where:{id},select:{status:true}});
 if(!event)throw new Error('This event no longer exists.');
 if(event.status!=='COMPLETED'&&event.status!=='ARCHIVED')
  throw new Error('Mark the rental completed and check the digital gallery before archiving.');
 if(event.status!=='ARCHIVED')await prisma.event.update({where:{id},data:{status:'ARCHIVED'}});
 revalidatePath('/events');revalidatePath('/events/'+id);
 redirect('/events/'+id);
}
export async function deleteEvent(id,form){
 await requireAdmin();
 const event=await prisma.event.findUnique({where:{id},select:{id:true,name:true,status:true,customerId:true}});
 if(!event)redirect('/events');
 // Intentionally fail closed. "Delete" is NEVER the next-event button.
 if(event.status!=='ARCHIVED')throw new Error('Archive the completed event before permanent deletion.');
 if(value(form,'confirmation')!==event.name||value(form,'galleryChecked')!=='yes')
  throw new Error('Verify the customer gallery and type the full event name before deleting.');
 await prisma.$transaction(async tx=>{
  // Backups are in a separate private table. Purge only this archived event's
  // images in the same transaction as the booking deletion, so a failed
  // relational delete cannot strand or prematurely destroy the photographs.
  await tx.$executeRaw`DELETE FROM booth_backup_v1.images WHERE event_id=${id}`;
  await tx.event.delete({where:{id}});
  if(event.customerId){
   const others=await tx.event.count({where:{customerId:event.customerId}});
   if(!others)await tx.customer.delete({where:{id:event.customerId}});
  }
 });
 revalidatePath('/dashboard');revalidatePath('/events');
 redirect('/events');
}

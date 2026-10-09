import Link from 'next/link';
import {prisma} from '../../../../lib/prisma';
import {updateEvent} from '../../actions';
import {EVENT_TYPES,toLocalDay,wallTime,experienceFrom} from '../../../../lib/studio-experience.mjs';
import {PageHeader,DatabaseError} from '../../../StudioUI';
import ExperienceEditor from '../../../ExperienceEditor';
import '../../../owner-event.css';
export const dynamic='force-dynamic';
const F=({label,hint,children})=><label className="formField">{label}{children}{hint&&<small>{hint}</small>}</label>;
export default async function EditEventPage({params}){
 let event,booths=[],templates=[],error=null;
 try{[event,booths,templates]=await Promise.all([
  prisma.event.findUnique({where:{id:params.id},include:{customer:true,template:true}}),
  prisma.booth.findMany({orderBy:{name:'asc'}}),
  prisma.template.findMany({where:{archived:false},orderBy:{name:'asc'}})
 ]);}catch(e){error=e;}
 if(error)return <main className="page"><DatabaseError topic="event editing"/><Link href="/events" className="btn btn2">Back to events</Link></main>;
 if(!event)return <main className="page"><h1 className="title">Event not found</h1><Link href="/events" className="btn">All events</Link></main>;
 const save=updateEvent.bind(null,event.id),experience=experienceFrom(event),type=String(event.eventType||'Party');
 return <main className="page formWide ownerEventPage">
  <Link href={'/events/'+event.id} className="btnPlain ownerBackLink">← Back to event</Link>
  <PageHeader eyebrow="PREPARE THE EVENT" title="Details and approved design" subtitle="Enter the event details, choose one matching look, then save and load it on the iPad."/>
  <form action={save} className="uiStack ownerEventForm">
   <section className="card formSection" id="client" data-testid="owner-event-basics">
    <h2 className="sectionTitle">Customer and event details</h2>
    <div className="formGrid">
     <F label="Customer name *"><input className="input" name="customerName" defaultValue={event.customer?.name||''} required/></F>
     <F label="Event name *"><input className="input" name="eventName" required defaultValue={event.name}/></F>
     <F label="Customer email"><input className="input" name="customerEmail" type="email" defaultValue={event.customer?.email||''} placeholder="email@example.com"/></F>
     <F label="Customer phone"><input className="input" name="customerPhone" type="tel" defaultValue={event.customer?.phone||''} placeholder="(315) 555-0000"/></F>
     <F label="Event type"><select name="eventType" className="input" defaultValue={type}>{![...EVENT_TYPES,'wedding','birthday','corporate','graduation','party'].includes(type)&&<option value={type}>{type}</option>}{EVENT_TYPES.map(value=><option key={value} value={value}>{value}</option>)}{['wedding','birthday','corporate','graduation','party'].includes(type)&&<option value={type}>{type[0].toUpperCase()+type.slice(1)+' (existing)'}</option>}</select></F>
     <F label="Event date *"><input className="input" name="date" type="date" defaultValue={toLocalDay(event.date)} required/></F>
     <F label="Start time *"><input className="input" name="startTime" type="time" defaultValue={wallTime(event.startTime)} required/></F>
     <F label="End time *" hint="An earlier end time means the following day."><input className="input" name="endTime" type="time" defaultValue={wallTime(event.endTime)} required/></F>
    </div>
    <div className="formGrid ownerVenueFields" id="venue">
     <F label="Venue name"><input className="input" name="venueName" defaultValue={event.venueName||''} placeholder="Venue or host's home"/></F>
     <F label="Street address"><input className="input" name="venueAddress" defaultValue={event.venueAddress||''} placeholder="Street, city, state, ZIP"/></F>
    </div>
   </section>
   <input type="hidden" name="numberOfPhotos" value={event.numberOfPhotos===3?'3':'4'}/>
   <ExperienceEditor initial={experience} eventType={type} eventName={event.name} eventDate={toLocalDay(event.date)}/>
   <details className="card ownerEventDetails" id="equipment" data-testid="owner-event-advanced">
    <summary>Booth, print allowance &amp; staff notes{!event.boothId&&<span className="ownerSettingNeeded">Booth assignment needed</span>}</summary>
    <div className="formSection ownerAdvancedFields">
     <div className="formGrid">
      <F label="Physical photo booth"><select className="input" name="boothId" defaultValue={event.boothId||''}><option value="">Choose a booth…</option>{booths.map(booth=><option key={booth.id} value={booth.id}>{booth.name} · {booth.status==='MAINTENANCE'?'Maintenance':booth.status==='ONLINE'?'Marked online':'Marked offline'}</option>)}</select></F>
      <F label="Legacy print design record (optional)" hint="The approved design above is used for guest photos."><select className="input" name="templateId" defaultValue={event.templateId||''}><option value="">No legacy record</option>{event.templateId&&!templates.some(template=>template.id===event.templateId)&&<option value={event.templateId}>{event.template?.name||'Existing saved design record'} · saved with this event</option>}{templates.map(template=><option key={template.id} value={template.id}>{template.name} · {template.format.replaceAll('_',' ')}</option>)}</select></F>
     </div>
     {!booths.length&&<p className="warningNote">No booth is registered yet. <Link href="/booths/new">Register the photo booth →</Link></p>}
     <div className="formGrid ownerVenueFields" id="printing">
      <F label="Allowed physical print sheets" hint="108 standard; 162 with +54; 216 with +108."><input className="input" type="number" min="0" max="10000" step="1" name="maxPrints" defaultValue={event.maxPrints??108} required/></F>
      <F label="Guest printing enabled"><select className="input" name="printingEnabled" defaultValue={event.printingEnabled?'yes':'no'}><option value="yes">Yes</option><option value="no">No · digital only</option></select></F>
      <F label="QR digital sharing"><select className="input" name="qrSharingEnabled" defaultValue={event.qrSharingEnabled?'yes':'no'}><option value="yes">Allowed where configured</option><option value="no">Disabled</option></select></F>
     </div>
     <p className="ownerGalleryHelp">Email and text delivery require a configured sending service on the booth. This setting alone does not activate one.</p>
     <F label="Private staff notes" hint="Parking, loading entrance, setup instructions."><textarea className="input" rows={3} name="internalNotes" defaultValue={event.internalNotes||''}/></F>
    </div>
   </details>
   <div className="saveDock"><p>Save, then open the event’s iPad setup link.</p><div className="buttonRow"><Link href={'/events/'+event.id} className="btn btn2">Cancel</Link><button className="btn" type="submit">Save event changes →</button></div></div>
  </form>
 </main>;
}

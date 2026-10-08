import Link from 'next/link';
import {prisma} from '../../../../lib/prisma';
import {updateEvent} from '../../actions';
import {EVENT_TYPES,toLocalDay,wallTime,experienceFrom,guestHandoffMessage,BOOTH_SETUP_URL} from '../../../../lib/studio-experience.mjs';
import {PageHeader,DatabaseError} from '../../../StudioUI';
import ExperienceEditor from '../../../ExperienceEditor';
export const dynamic='force-dynamic';
const F=({label,hint,children})=><label className="formField">{label}{children}{hint&&<small>{hint}</small>}</label>;
export default async function EditEventPage({params}){
 let event,booths=[],templates=[],error=null;
 try{[event,booths,templates]=await Promise.all([
  prisma.event.findUnique({where:{id:params.id},include:{customer:true}}),
  prisma.booth.findMany({orderBy:{name:'asc'}}),
  prisma.template.findMany({where:{archived:false},orderBy:{name:'asc'}})
 ]);}catch(e){error=e;}
 if(error)return <main className="page"><DatabaseError topic="event editing"/><Link href="/events" className="btn btn2">Back to events</Link></main>;
 if(!event)return <main className="page"><h1 className="title">Event not found</h1><Link href="/events" className="btn">All events</Link></main>;
 const save=updateEvent.bind(null,event.id),experience=experienceFrom(event);
 const type=String(event.eventType||'Party');
 return <main className="page formWide">
  <Link href={'/events/'+event.id} className="btnPlain" style={{paddingLeft:0}}>← Back to event</Link>
  <PageHeader eyebrow="EDIT EVENT · SIMPLE STEP-BY-STEP SETUP" title={'Set up '+event.name} subtitle="Work from top to bottom, or jump to what you need. Save once at the bottom; the existing photos and print counters are not reset."/>
  <nav className="formNav" aria-label="Jump to event settings"><a href="#client">Customer & date</a><a href="#venue">Venue</a><a href="#equipment">Booth & design</a><a href="#experience">Photos</a><a href="#style">Colors & strips</a><a href="#printing">Printing</a></nav>
  <form action={save} className="uiStack">
   <section className="card formSection" id="client">
    <div className="eyebrow">STEP 01 · THE BASICS</div><h2 className="sectionTitle">Who, what and when?</h2><p className="sectionLead">These are the details staff need on event day.</p>
    <div className="formGrid">
     <F label="Customer name *"><input className="input" name="customerName" defaultValue={event.customer?.name||''} required/></F>
     <F label="Customer email"><input className="input" name="customerEmail" type="email" defaultValue={event.customer?.email||''} placeholder="email@example.com"/></F>
     <F label="Customer phone"><input className="input" name="customerPhone" type="tel" defaultValue={event.customer?.phone||''} placeholder="(315) 555-0000"/></F>
     <F label="Event name *"><input className="input" name="eventName" required defaultValue={event.name}/></F>
     <F label="Event type"><select name="eventType" className="input" defaultValue={type}>{![...EVENT_TYPES,'wedding','birthday','corporate','graduation','party'].includes(type)&&<option value={type}>{type}</option>}{EVENT_TYPES.map(v=><option key={v} value={v}>{v}</option>)}{['wedding','birthday','corporate','graduation','party'].includes(type)&&<option value={type}>{type[0].toUpperCase()+type.slice(1)+' (existing)'}</option>}</select></F>
     <F label="Event date *"><input className="input" name="date" type="date" defaultValue={toLocalDay(event.date)} required/></F>
     <F label="Start time *" hint="Times are entered in the event’s local clock time."><input className="input" name="startTime" type="time" defaultValue={wallTime(event.startTime)} required/></F>
     <F label="End time *" hint="Midnight or later is allowed; an earlier end time means the following day."><input className="input" name="endTime" type="time" defaultValue={wallTime(event.endTime)} required/></F>
    </div>
   </section>
   <section className="card formSection" id="venue">
    <div className="eyebrow">STEP 02 · WHERE TO GO</div><h2 className="sectionTitle">Venue and delivery details</h2><p className="sectionLead">An event won’t show “Core setup complete” until both venue and address are entered.</p>
    <div className="formGrid">
     <F label="Venue name"><input className="input" name="venueName" defaultValue={event.venueName||''} placeholder="Venue or host's home"/></F>
     <F label="Street address"><input className="input" name="venueAddress" defaultValue={event.venueAddress||''} placeholder="Street, city, state, ZIP"/></F>
    </div>
    <div style={{marginTop:14}}><F label="Notes for staff" hint="Parking, gate access, loading entrance and contact instructions."><textarea className="input" rows={3} name="internalNotes" defaultValue={event.internalNotes||''}/></F></div>
   </section>
   <section className="card formSection" id="equipment">
    <div className="eyebrow">EQUIPMENT · REQUIRED BEFORE AN EVENT</div><h2 className="sectionTitle">Assign the photo booth</h2><p className="sectionLead">Select the physical booth. Choose and approve the customer's actual print artwork in Step 04 below; you do not need a second template selection.</p>
    <div className="formGrid">
     <F label="Physical photo booth"><select className="input" name="boothId" defaultValue={event.boothId||''}><option value="">Choose a booth…</option>{booths.map(b=><option key={b.id} value={b.id}>{b.name} · {b.status==='ONLINE'?'Marked online':b.status==='MAINTENANCE'?'Maintenance':'Marked offline'}</option>)}</select></F>
     <F label="Legacy print design record (optional)"><select className="input" name="templateId" defaultValue={event.templateId||''}><option value="">Choose a print design…</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name} · {t.format.replaceAll('_',' ')}</option>)}</select></F>
    </div>
    {(!booths.length||!templates.length)&&<div className="warningNote" style={{marginTop:14}}>Missing a registered booth? {!booths.length&&<Link href="/booths/new">Register the Photo Booth →</Link>}{!templates.length&&<span> The approved design below works without an old template record.</span>}</div>}
   </section>
   <input type="hidden" name="numberOfPhotos" value={event.numberOfPhotos===3?'3':'4'}/>
   <ExperienceEditor initial={experience} eventType={type}/>
   <section className="card formSection" id="printing">
    <div className="eyebrow">STEP 05 · OUTPUT</div><h2 className="sectionTitle">Printing and digital keepsakes</h2>
    <p className="sectionLead">One physical 4×6 sheet per guest print request. Digital downloads do not use a paper allowance.</p>
    <div className="formGrid">
     <F label="Allowed physical print sheets" hint="Standard: 108. Add 54 for 162 or 108 for 216. Enter 0 for digital-only."><input className="input" type="number" min="0" max="10000" step="1" name="maxPrints" defaultValue={event.maxPrints??108} required/></F>
     <F label="Guest printing enabled"><select className="input" name="printingEnabled" defaultValue={event.printingEnabled?'yes':'no'}><option value="yes">Yes · show print option</option><option value="no">No · digital only</option></select></F>
     <F label="QR digital sharing"><select className="input" name="qrSharingEnabled" defaultValue={event.qrSharingEnabled?'yes':'no'}><option value="yes">Allowed where configured</option><option value="no">Disabled</option></select></F>
    </div>
    <div className="helpNote" style={{marginTop:18}}><strong>Important:</strong> Enabling a sharing option here does not connect an email or text provider. The booth must have that service configured and tested separately.</div>
   </section>
   <div className="saveDock"><p><strong>Ready to save?</strong> This updates the admin event only. Saved guest photos and iPad print counters stay untouched.</p><div className="buttonRow"><Link href={'/events/'+event.id} className="btn btn2">Cancel</Link><button className="btn" type="submit">Save event changes ✓</button></div></div>
  </form>
  <div className="noticeOnly" style={{marginTop:19}}>{guestHandoffMessage()} <a href={BOOTH_SETUP_URL} target="_blank" rel="noopener noreferrer">Open booth setup ↗</a></div>
 </main>;
}

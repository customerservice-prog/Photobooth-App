import Link from 'next/link';
import {createEvent} from '../actions';
import {EVENT_TYPES} from '../../../lib/studio-experience.mjs';
import {PageHeader} from '../../StudioUI';
const F=({label,hint,children})=><label className="formField">{label}{children}{hint&&<small>{hint}</small>}</label>;
export default function NewEventPage(){
 return <main className="page pageCompact">
  <Link href="/events" className="btnPlain" style={{paddingLeft:0}}>← All events</Link>
  <PageHeader eyebrow="START HERE" title="Add your next event" subtitle="Just the basics first. After saving, you’ll choose the photo booth, design, guest photo choices, and print allowance."/>
  <form action={createEvent} className="uiStack">
   <section className="card formSection">
    <div className="eyebrow">01 · CUSTOMER</div><h2 className="sectionTitle">Who is booking?</h2>
    <div className="formGrid">
     <F label="Customer name *"><input className="input" name="customerName" required autoComplete="name" placeholder="Full name"/></F>
     <F label="Email"><input className="input" name="customerEmail" type="email" autoComplete="email" placeholder="name@email.com"/></F>
     <F label="Phone"><input className="input" name="customerPhone" type="tel" autoComplete="tel" placeholder="(315) 555-0000"/></F>
    </div>
   </section>
   <section className="card formSection">
    <div className="eyebrow">02 · CELEBRATION</div><h2 className="sectionTitle">What and when?</h2>
    <div className="formGrid">
     <F label="Event name *"><input className="input" name="eventName" required placeholder="The Johnson Wedding"/></F>
     <F label="Occasion"><select className="input" name="eventType" defaultValue="Wedding">{EVENT_TYPES.map(type=><option key={type}>{type}</option>)}</select></F>
     <F label="Event date *"><input className="input" type="date" name="date" required/></F>
     <F label="Start time *"><input className="input" type="time" name="startTime" required defaultValue="18:00"/></F>
     <F label="End time *" hint="Use 00:00 for midnight; the next day is handled automatically."><input className="input" type="time" name="endTime" required defaultValue="22:00"/></F>
     <F label="Venue name"><input className="input" name="venueName" placeholder="Venue or customer's home"/></F>
    </div>
    <div style={{marginTop:15}}><F label="Street address (optional for now)"><input className="input" name="venueAddress" placeholder="Street, city, state and ZIP"/></F></div>
    <div style={{marginTop:15}}><F label="Notes for setup crew"><textarea className="input" name="internalNotes" rows={3} placeholder="Loading door, parking, special instructions…"/></F></div>
   </section>
   <div className="saveDock"><p><strong>Next:</strong> Save this event, then you’ll finish the booth and photo settings. This won’t change any existing event.</p><div className="buttonRow"><Link href="/events" className="btn btn2">Cancel</Link><button type="submit" className="btn">Save & continue →</button></div></div>
  </form>
 </main>;
}
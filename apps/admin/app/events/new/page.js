import Link from 'next/link';
import {createEvent} from '../actions';
import {EVENT_TYPES} from '../../../lib/studio-experience.mjs';
import {PageHeader} from '../../StudioUI';
import '../../owner-event.css';
const F=({label,hint,children})=><label className="formField">{label}{children}{hint&&<small>{hint}</small>}</label>;
export default function NewEventPage(){
 return <main className="page pageCompact ownerNewEvent">
  <Link href="/events" className="btnPlain ownerBackLink">← All events</Link>
  <PageHeader eyebrow="PREPARE THE NEXT RENTAL" title="Create a photo booth event" subtitle="Start with the customer and date. Next, choose one approved design for both 1 Photo and 4 Photos."/>
  <form action={createEvent} className="uiStack" data-testid="owner-new-event">
   <section className="card formSection">
    <h2 className="sectionTitle">Customer details</h2>
    <div className="formGrid">
     <F label="Customer name *"><input className="input" name="customerName" required autoComplete="name" placeholder="Full name"/></F>
     <F label="Email"><input className="input" name="customerEmail" type="email" autoComplete="email" placeholder="name@email.com"/></F>
     <F label="Phone"><input className="input" name="customerPhone" type="tel" autoComplete="tel" placeholder="(315) 555-0000"/></F>
    </div>
   </section>
   <section className="card formSection">
    <h2 className="sectionTitle">Event and date</h2>
    <div className="formGrid">
     <F label="Event name *"><input className="input" name="eventName" required placeholder="The Johnson Wedding"/></F>
     <F label="Occasion"><select className="input" name="eventType" defaultValue="Wedding">{EVENT_TYPES.map(type=><option key={type}>{type}</option>)}</select></F>
     <F label="Event date *"><input className="input" type="date" name="date" required/></F>
     <F label="Start time *"><input className="input" type="time" name="startTime" required defaultValue="18:00"/></F>
     <F label="End time *" hint="An earlier end time means the following day."><input className="input" type="time" name="endTime" required defaultValue="22:00"/></F>
     <F label="Venue name"><input className="input" name="venueName" placeholder="Venue or customer's home"/></F>
    </div>
    <div style={{marginTop:15}}><F label="Street address (optional for now)"><input className="input" name="venueAddress" placeholder="Street, city, state and ZIP"/></F></div>
   </section>
   <details className="card ownerEventDetails"><summary>Private staff notes</summary><div className="formSection"><F label="Setup instructions"><textarea className="input" name="internalNotes" rows={3} placeholder="Loading door, parking, special instructions…"/></F></div></details>
   <div className="saveDock"><p>Next: preview the matching designs and save your event setup.</p><div className="buttonRow"><Link href="/events" className="btn btn2">Cancel</Link><button type="submit" className="btn">Continue to design →</button></div></div>
  </form>
 </main>;
}

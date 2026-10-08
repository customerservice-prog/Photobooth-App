import Link from 'next/link';
import {createBooth} from '../actions';
import {PageHeader} from '../../StudioUI';
export default function NewBoothPage(){
 return <main className="page pageCompact">
  <Link className="btnPlain" style={{paddingLeft:0}} href="/booths">← My booths</Link>
  <PageHeader eyebrow="ADD EQUIPMENT" title="Register a photo booth" subtitle="Give the booth a simple name staff will recognize. Add it to an event after saving."/>
  <form action={createBooth} className="card formSection" style={{maxWidth:640}}>
   <div className="formGrid">
    <label className="formField">Booth name *<input className="input" name="name" placeholder="Booth 01" required autoFocus/><small>For example: Booth 01 or Wedding iPad.</small></label>
    <label className="formField">Printer type<select className="input" name="printerAdapter" defaultValue="canon_selphy"><option value="canon_selphy">Canon SELPHY (4×6)</option></select><small>The printer still needs to be paired and tested on the iPad.</small></label>
   </div>
   <div className="helpNote" style={{margin:'18px 0'}}><strong>What happens next?</strong> The new booth starts with a recorded Offline status until a connected device sends a heartbeat. Creating it won’t remotely pair the printer.</div>
   <div className="buttonRow"><button className="btn" type="submit">Save booth</button><Link href="/booths" className="btn btn2">Cancel</Link></div>
  </form>
 </main>;
}
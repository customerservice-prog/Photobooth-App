import QRCode from 'qrcode';
import HandoffActions from './HandoffActions';
import {makeEventHandoff,makeHandoffLink,handoffFileName} from '../lib/booth-handoff.mjs';
import {readiness,guestHandoffMessage} from '../lib/studio-experience.mjs';
export default async function BoothHandoff({event}){
 const data=makeEventHandoff(event),url=makeHandoffLink(event),ready=readiness(event);
 const image=await QRCode.toDataURL(url,{width:340,margin:2,errorCorrectionLevel:'M',color:{dark:'#214c37',light:'#ffffff'}});
 return <section id="handoff" className="card cardPad boothHandoff">
  <div className="sectionHeader"><div><div className="eyebrow">STEP 02 OF 04 · NO MORE DOUBLE ENTRY</div><h2 className="sectionTitle">Send this event to the booth</h2><p className="sectionLead">The event's name, date, colors, photo options and print allowance are packed together. Staff load them once on the iPad.</p></div><span className="statusChip">Ready to transfer</span></div>
  {!ready.ready&&<div className="warningNote" role="status" style={{marginBottom:14}}>Some booking details are still incomplete. You can load this event for testing, but finish the event checklist before guests arrive.</div>}
  <div className="handoffLayout">
   <div className="handoffHow">
    <ol className="handoffSteps">
     <li><strong>On the event iPad</strong><span>Open Friendly Booth's <em>Staff tools → Load event</em>. If you're using the booth in Safari, you can also scan this QR code.</span></li>
     <li><strong>Check the details</strong><span>The booth shows the name, photo count, pause and printing options before changing anything.</span></li>
     <li><strong>Tap “Load this event”</strong><span>That saves the settings on that device. Existing photos and print counters stay untouched.</span></li>
     <li><strong>Test before guests arrive</strong><span>Take a one-photo and four-photo test, check sound, then inspect a real Canon print.</span></li>
    </ol>
    <HandoffActions url={url} payload={data} fileName={handoffFileName(event)}/>
    <p className="inlineInfo"><strong>Installed iPad app?</strong> If a QR link opens Safari instead of the installed app, use the <em>Download setup file</em> option and import that file from the installed app's Staff tools. The two apps may have separate device storage.</p>
   </div>
   <figure className="handoffCode"><img src={image} width="300" height="300" alt="QR code to load this event on the Photo Booth device"/><figcaption>Scan to review this event on an iPad.<br/>Do not post the code publicly.</figcaption></figure>
  </div>
  <p className="noticeOnly" style={{marginTop:16}}><strong>One-way transfer:</strong> If you edit this event later, send a new copy. The booth does not automatically read live admin changes. No customer email, phone or venue address is included in the transfer.</p>
 </section>;
}
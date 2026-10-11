'use client';
import StaffPageNav from '../components/StaffPageNav';
import BoothContextLink from '../components/BoothContextLink';
import {useEffect,useMemo,useState} from 'react';
import {readBoothCapabilities,probeLocalPhotoStorage,boothDiagnosticChecks,diagnosticLimits} from '../lib/booth-readiness.mjs';

const sections=[
  {id:'printer',title:'Printer stuck / not printing',steps:[
    'Keep the guest’s finished photo open. Check that the Canon SELPHY is on, has the correct paper and ink, and shows no error.',
    'Confirm the iPad and Canon have a reachable Wi‑Fi connection for AirPrint. Ask staff before changing the event’s Wi‑Fi.',
    'Tap Print once. In the iPad print options, select Canon SELPHY, 4 × 6 paper and one copy.',
    'If printing was canceled or no sheet came out, tap Retry print. Staff must authorize access and check the printer before choosing No sheet printed · restore print. Then tap Print again.',
    'If a sheet already printed or a job is still running, choose Keep this print request. Opening or closing print options does not prove that paper printed.',
    'For a stalled job or paper error, read the Canon’s message and have staff check the print queue. Keep the front and rear paper path clear; do not pull moving paper or force a cartridge.',
    'If the printer is missing or needs restarting, have staff use Canon wireless printing in Staff tools. Print and check one sample sheet before returning the booth to guests.'
  ]},
  {id:'send',title:'Guest cannot text or email the photo',steps:[
    'Tap Send on the finished photo to open Send your photo.',
    'When direct delivery is available, choose Email with image attachment or Text with private download link. Enter the guest’s own contact, have them check the consent box, then tap Send my keepsake.',
    'Direct text and email need internet, owner configuration and authorization on this iPad. If those choices are missing, ask staff to open Digital delivery in Staff tools and check the setup.',
    'Read the result. Provider acceptance is not proof that the photo reached an inbox or phone. Use Check provider receipt when available, and ask the guest to check their device, including email spam.',
    'If the connection is interrupted, use Check this request. It reuses the same request; do not start a new message while the first result is uncertain.',
    'Share to another device opens this iPad’s sharing options. Available apps vary; confirm the photo arrives on the receiving device.',
    'Save photo downloads the JPEG to this iPad. Open it in Files or Downloads to check the copy, especially when offline. Keep the photo open until the guest or staff has a usable copy.'
  ]},
  {id:'camera',title:'Camera is black, frozen, or will not start',steps:[
    'If a capture is stuck, tap Cancel session and ask the attendant. Photos already saved remain in the event archive.',
    'On the welcome screen, choose 1 Photo or 4 Photos, then tap Start 1 photo or Start 4 photos.',
    'Choose Allow when the iPad asks for camera access. If access was denied, have staff check camera permission for this booth in Safari.',
    'Keep Friendly Booth visible while the camera starts. Switching apps or locking the iPad can stop a photo session.',
    'If the camera still fails, check saved photos before restarting the app. End Guided Access if needed, reopen the same Friendly Booth app, and try one 1 Photo session.',
    'Confirm the camera view and finished photo work before starting the next guest. The website cannot change iPad camera permissions for you.'
  ]},
  {id:'guided-access',title:'Keep guests in the booth and prevent screen sleep',steps:[
    'Open Friendly Booth from its Home Screen icon on the event iPad. Set up the event and make a test photo before locking the iPad.',
    'In iPad Settings → Accessibility → Guided Access, turn Guided Access on. Under Passcode Settings, set a private staff-only Guided Access passcode.',
    'Under Guided Access → Display Auto-Lock, select Never for an always-on screen, or choose a shorter time if staff wants the display to sleep.',
    'Open Friendly Booth and triple-click the iPad top button (or Home button on an older iPad). Select Guided Access.',
    'Open Session Settings / Options. Keep Touch enabled; disable Top / Home Button so guests cannot use the sleep button; leave Time Limit off. Tap Start.',
    'In Friendly Booth → Staff tools, keep Keep the screen awake on for an additional screen-on request. Staff can turn it off to allow normal sleep, but the Guided Access display setting must also permit sleep.',
    'Test the Home swipe, a photo session, printing and sharing with the actual iPad before guests arrive. Guided Access may limit switching to other apps for sharing.',
    'To leave when staff wants to, triple-click the top / Home button, authenticate with the Guided Access passcode or approved biometrics, then tap End.',
    'The booth website cannot start, verify, or override Apple Guided Access. Do not consider the iPad locked until the physical Guided Access test succeeds.'
  ]},
  {id:'offline',title:'No internet / weak service',steps:[
    'Keep the already-open Friendly Booth app running when venue internet drops.',
    'Capture can continue if the camera and local photo storage are working. If saving fails, keep the finished photo open and ask staff for help.',
    'AirPrint may still work over the local printer connection. Direct text, email and online gallery uploads need internet.',
    'Use Send → Save photo for a local JPEG, then open it in Files or Downloads. Share or send it after service returns.',
    'When internet returns, open Staff tools → Automatic event gallery and tap Retry backup now. Wait until all photo files are saved to the event gallery.',
    'The connection indicator alone does not confirm delivery or gallery backup. Check the receiving device and this event’s digital gallery before packing up.'
  ]},
  {id:'print-quality',title:'Print looks wrong, dark, cropped, or rotated',steps:[
    'Check the finished preview first. If the photo or event design looks wrong there, ask staff to fix it before printing.',
    'In the iPad print options, select Canon SELPHY, 4 × 6 paper and one copy. Available printer settings depend on the iPad and Canon.',
    'Open Staff tools → Canon wireless printing and choose 1 Photo or 4 Photos for the saved event design. Print one sample sheet after changing paper, ink, Wi‑Fi or printer settings.',
    'Check the actual sheet: every photo is visible, the event name is correct, and colors and edges look right.',
    'Resume guest printing only after the corrected sample finishes. The app cannot verify physical print quality or whether a sheet came out.'
  ]},
  {id:'recovery',title:'Guest photo disappeared',steps:[
    'On the welcome screen, tap Staff tools and authorize staff access when asked.',
    'Open Recover a recent photo and tap the correct saved capture to return to its preview.',
    'Confirm the guest and event before printing or sending the photo. The recent list shows up to eight saved captures; the complete event archive is separate.',
    'For an older photo, check the event archive or the selected event’s digital gallery. Offline uploads may still be waiting on this iPad.',
    'Local recovery belongs to this iPad and browser or Home Screen app. Do not clear website data, uninstall the app or remove the event while photos still need recovery.'
  ]},
  {id:'frozen',title:'Booth is frozen or buttons stop responding',steps:[
    'Wait a few seconds while the booth prepares, saves, prints or sends the photo. Keep the current photo open.',
    'If a button still works, use Send → Save photo and open the JPEG, or check Staff tools → Recover a recent photo before restarting.',
    'If the app remains frozen, have staff end Guided Access, close Friendly Booth from the app switcher and reopen the same app. Recover the guest’s saved photo first.',
    'Test one 1 Photo session, a digital copy and a physical sample print. Restart Guided Access and check that guests cannot leave before reopening the booth.'
  ]}
];

export default function Help(){
  const[diag,setDiag]=useState(null);
  const[checkRun,setCheckRun]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    async function run(){
      setDiag(readBoothCapabilities());
      const photoStorage=await probeLocalPhotoStorage();
      if(!cancelled)setDiag(current=>({...current,photoStorage}));
    } run();
    const updateNetwork=()=>setDiag(current=>current?{...current,online:navigator.onLine===true}:current);
    window.addEventListener('online',updateNetwork);
    window.addEventListener('offline',updateNetwork);
    return ()=>{cancelled=true;window.removeEventListener('online',updateNetwork);window.removeEventListener('offline',updateNetwork);};
  },[checkRun]);
  const checks=useMemo(()=>diag?boothDiagnosticChecks(diag):[],[diag]);
  return <main className="helpPage"><div className="helpWrap"><StaffPageNav/>
    <header className="helpHero"><div className="helpSeal">?</div><div><div className="kicker">Friendly Photo Booth Support</div><h1>Quick Fix Guide</h1><p>Use this page during an event. Start with the symptom, follow the steps in order, then run one test before returning the booth to guests.</p></div></header>
    <section className="diagCard"><div><div className="kicker">This iPad right now</div><h2>Booth readiness</h2></div><div className="diagGrid" aria-live="polite">{checks.map(({key,label,ok})=><div className={'diagItem '+(ok===null?'pending':ok?'ok':'bad')} key={key}><b aria-label={ok===null?'Checking':ok?'Check passed':'Check failed'}>{ok===null?'…':ok?'✓':'!'}</b><span>{label}{ok===null?' · checking':''}</span></div>)}</div><p className="diagNote">{diagnosticLimits}</p><button type="button" className="action" disabled={diag?.photoStorage===null} onClick={()=>setCheckRun(value=>value+1)}>Run checks again</button></section>
    <section className="panicCard"><strong>During an event:</strong> Keep the guest’s photo open. Use Send → Save photo and check the JPEG in Files or Downloads before restarting. Do not clear Safari data, uninstall the Home Screen app, or reset the iPad while photos still need recovery.
    </section>
    <div className="helpGrid">{sections.map(s=><details id={s.id} className="helpSection" key={s.id} open={s.id==='printer'||s.id==='send'}><summary>{s.title}<span>+</span></summary><ol>{s.steps.map(x=><li key={x}>{x}</li>)}</ol></details>)}</div>
    <section className="ownerCard"><div className="kicker">Owner / attendant end-of-event</div><h2>Before packing up</h2><div className="ownerChecklist"><span>□ 1. Finish the last guest session and check any photos needing recovery.</span><span>□ 2. Open Staff tools → Automatic event gallery. Keep the iPad online, tap Retry backup now, and wait until all photo files are saved.</span><span>□ 3. Open Finish the event &amp; save all digital photos. Check the selected event’s digital gallery and download its online photos.</span><span>□ 4. Tap Download complete event gallery ZIP for an additional copy of this iPad’s originals, capture collages and available finished JPEGs.</span><span>□ 5. Open the ZIP in Files or Downloads. Check the session count and photos, and securely keep a usable copy for the customer. A download request alone is not verification.</span><span>□ 6. Only after online backup and ZIP verification, use Remove this completed event from the iPad if preparing the next rental. Check the verification box, type CLOSE EVENT, then tap Remove this event and return to setup.</span><span>□ 7. Local event removal permanently deletes this event’s photos, settings and print ledger from this iPad. If backup or export is incomplete, keep the event and reconnect; do not delete it.</span><span>□ 8. End Guided Access, set the preferred screen sleep setting, and pack the printer, paper, ink and charger.</span></div></section>
    <div className="helpActions"><BoothContextLink href="/test">Open rehearsal checklist</BoothContextLink><BoothContextLink href="/privacy">Photo privacy</BoothContextLink></div>
  </div></main>
}

'use client';
import {useEffect,useMemo,useState} from 'react';

const sections=[
  {id:'printer',title:'Printer stuck / not printing',steps:[
    'Make sure the Canon SELPHY is powered on and has paper and ink installed.',
    'On iPad, confirm Wi‑Fi is on. The iPad and printer must be reachable for AirPrint.',
    'Tap Print Keepsake again and check whether Canon SELPHY appears in the Printer field.',
    'If it does not appear, turn the printer off for 10 seconds, turn it back on, then reopen the print sheet.',
    'If a job is frozen, cancel the print job from the iPad print queue, then retry one photo.',
    'If paper is jammed, power the printer off before gently removing the paper. Do not force it.',
    'If the print is cropped, confirm 4 × 6 paper is selected and print one test before reopening the booth.'
  ]},
  {id:'send',title:'Guest cannot text or email the photo',steps:[
    'Tap Send / Save Photo.',
    'Choose Messages to text the photo, Mail to email it, AirDrop, or Save Image.',
    'If Messages or Mail is missing, swipe up in the share sheet and tap Edit Actions / More.',
    'If the share sheet does not open, tap Retake or Finish, reopen the photo, and try again.',
    'If the iPad is offline, Save Image can still preserve the photo locally; send it later when service returns.',
    'Never close the booth before confirming the guest either sent or saved the image.'
  ]},
  {id:'camera',title:'Camera is black, frozen, or will not start',steps:[
    'Return to the welcome screen and tap Signature Portrait again.',
    'If asked, choose Allow for Camera access.',
    'If the preview stays black, close Friendly Booth from the app switcher and reopen it.',
    'If that still fails, open Safari once, visit the booth, allow camera access, then reopen the Home Screen app.',
    'Do not start printing or sharing while the camera preview is still loading.'
  ]},
  {id:'guided-access',title:'Keep guests from leaving the booth',steps:[
    'Open Friendly Booth from the iPad Home Screen.',
    'Turn Guest Lock ON in the hidden operator controls.',
    'Use Apple Guided Access for the actual device lock: triple-click the iPad top/side button, choose Guided Access, then Start.',
    'Set a Guided Access passcode that guests do not know.',
    'At the end of the rental, triple-click the top/side button again, enter the Guided Access passcode, and tap End.',
    'A website cannot block iPad system gestures by itself; Guided Access is the iPad-level lock that prevents guests from leaving the app.'
  ]},
  {id:'offline',title:'No internet / weak service',steps:[
    'Do not close the booth app if the venue internet drops.',
    'Portrait capture and local backup can continue in the already-open session.',
    'Printing may still work if the printer connection is local and available.',
    'Texting/emailing may need internet or cellular service. Use Save Image and send later.',
    'When internet returns, confirm the READY indicator returns before assuming sharing is restored.'
  ]},
  {id:'print-quality',title:'Print looks wrong, dark, cropped, or rotated',steps:[
    'Confirm the preview itself looks correct before printing.',
    'Use 4 × 6 portrait paper size in the AirPrint sheet.',
    'Do one test print after changing paper, ink, Wi‑Fi, or printer settings.',
    'If the physical print differs from the screen, stop printing multiples until the test print is corrected.',
    'Do not promise a guest another print until the first corrected test print finishes.'
  ]},
  {id:'recovery',title:'Guest photo disappeared',steps:[
    'Open the hidden operator controls from the top-right operator area.',
    'Use Recent photo recovery to reopen one of the locally saved captures.',
    'Confirm the correct guest photo before printing or sharing it.',
    'Local recovery belongs to this iPad/browser only; do not clear website data during an event.'
  ]},
  {id:'frozen',title:'Booth is frozen or buttons stop responding',steps:[
    'Wait 5 seconds in case the iPad is finishing a photo, GIF, or share action.',
    'If nothing changes, close Friendly Booth from the iPad app switcher and reopen it.',
    'If Guided Access is active, end Guided Access first, restart the booth, then start Guided Access again.',
    'Test one portrait, one share action, and one print before handing the booth back to guests.'
  ]}
];

export default function Help(){
  const[diag,setDiag]=useState(null);
  useEffect(()=>{
    async function run(){
      let storage=false;try{localStorage.setItem('__booth_test__','1');localStorage.removeItem('__booth_test__');storage=true}catch{}
      let fileShare=false;
      try{const f=new File([new Blob(['test'],{type:'text/plain'})],'test.txt',{type:'text/plain'});fileShare=!!navigator.canShare?.({files:[f]})}catch{}
      setDiag({
        secure:window.isSecureContext,
        camera:!!navigator.mediaDevices?.getUserMedia,
        share:!!navigator.share,
        fileShare,
        print:typeof window.print==='function',
        storage,
        online:navigator.onLine,
        standalone:navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches===true
      });
    } run();
  },[]);
  const checks=useMemo(()=>diag?[
    ['Secure booth connection',diag.secure],
    ['Camera API available',diag.camera],
    ['iPad share sheet available',diag.share],
    ['Photo-file sharing available',diag.fileShare],
    ['AirPrint flow available',diag.print],
    ['Local photo backup writable',diag.storage],
    ['Internet connection',diag.online],
    ['Running from Home Screen',diag.standalone]
  ]:[],[diag]);
  return <main className="helpPage"><div className="helpWrap">
    <header className="helpHero"><div className="helpSeal">?</div><div><div className="kicker">Friendly Photo Booth Support</div><h1>Quick Fix Guide</h1><p>Use this page during an event. Start with the symptom, follow the steps in order, then run one test before returning the booth to guests.</p></div></header>
    <section className="diagCard"><div><div className="kicker">This iPad right now</div><h2>Booth readiness</h2></div><div className="diagGrid">{checks.map(([label,ok])=><div className={'diagItem '+(ok?'ok':'bad')} key={label}><b>{ok?'✓':'!'}</b><span>{label}</span></div>)}</div><p className="diagNote">Software diagnostics cannot confirm paper, ink, physical printer connection, or the quality of a real 4 × 6 print. Those need a physical test.</p></section>
    <section className="panicCard"><strong>During an event:</strong> If a guest is waiting, save the photo first. Then troubleshoot. Do not clear Safari data, uninstall the Home Screen app, or reset the iPad while photos still need recovery.
    </section>
    <div className="helpGrid">{sections.map(s=><details id={s.id} className="helpSection" key={s.id} open={s.id==='printer'||s.id==='send'}><summary>{s.title}<span>+</span></summary><ol>{s.steps.map(x=><li key={x}>{x}</li>)}</ol></details>)}</div>
    <section className="ownerCard"><div className="kicker">Owner / attendant end-of-event</div><h2>Before packing up</h2><div className="ownerChecklist"><span>□ End Guided Access</span><span>□ Confirm Guest Lock can be disabled</span><span>□ Check local photo recovery</span><span>□ Print one final test</span><span>□ Confirm printer, paper, ink, charger</span><span>□ Close booth only after recovery is checked</span></div></section>
    <div className="helpActions"><a href="/bryan-wedding">← Back to Booth</a><a href="/test">Open Full Rehearsal Test</a></div>
  </div></main>
}

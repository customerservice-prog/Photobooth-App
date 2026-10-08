'use client';
import {useEffect,useState} from 'react';
import {COLORS,PHOTO_PAUSES,approvedDesignFor} from '../lib/studio-experience.mjs';
const PRINT_STYLES=[
 {id:'ivory',name:'Classic White',desc:'Bright, timeless celebration'},
 {id:'blush',name:'Midnight',desc:'A darker, elegant photo design'},
 {id:'champagne',name:'Celebration',desc:'Uses the customer’s event colors'},
 {id:'grad-gala',name:'Navy & Gold Grad Party',desc:'Navy, orange, gold and big graduation photos'}
];
export default function ExperienceEditor({initial,eventType='Other celebration'}){
 const [kind,setKind]=useState(eventType);
 const [featured,setFeatured]=useState(initial.featured);
 const [pause,setPause]=useState(initial.pauseSeconds);
 const [fit,setFit]=useState(initial.photoFit);
 const [palette,setPalette]=useState(initial.paletteId);
 const [primary,setPrimary]=useState(initial.primary);
 const [accent,setAccent]=useState(initial.accent);
 const [design,setDesign]=useState(approvedDesignFor(eventType,initial.approvedDesign));
 const [printName,setPrintName]=useState(initial.nameOnPrint||'');
 const [year,setYear]=useState(initial.classYear||'');
 const graduation=/graduation/i.test(kind);
 const styles=graduation?PRINT_STYLES:PRINT_STYLES.slice(0,3);
 const selected=styles.find(x=>x.id===design)||styles[2];
 // Changing the event type above updates the available approved designs.
 useEffect(()=>{
  const input=document.querySelector('select[name="eventType"]');
  if(!input)return;
  const update=()=>setKind(input.value);
  input.addEventListener('change',update);
  return()=>input.removeEventListener('change',update);
 },[]);
 useEffect(()=>{if(!graduation&&design==='grad-gala')setDesign('champagne');},[graduation,design]);
 function choosePalette(p){setPalette(p.id);setPrimary(p.primary);setAccent(p.accent);}
 return <>
  <section id="experience" className="card formSection">
   <div className="eyebrow">STEP 03 · GUEST CHOICES</div>
   <h2 className="sectionTitle">Guests only choose 1 or 4 photos</h2>
   <p className="sectionLead">The event artwork is prepared here, not by guests. Both choices use the same approved theme. No guest template picker.</p>
   <div className="choiceGrid" role="group" aria-label="Featured guest photo experience">
    <label className="choice"><input type="radio" name="featured" value="one" checked={featured==='one'} onChange={()=>setFeatured('one')}/><span><strong>1 Photo</strong><small>One pose in the approved full-size 4×6 design</small></span></label>
    <label className="choice"><input type="radio" name="featured" value="four" checked={featured==='four'} onChange={()=>setFeatured('four')}/><span><strong>4 Photos</strong><small>Four poses in the approved 4×6 multi-photo design</small></span></label>
   </div>
   <div className="formGrid" style={{marginTop:18}}>
    <label className="formField">Time between four-photo poses<select className="input" name="pauseSeconds" value={pause} onChange={e=>setPause(Number(e.target.value))}>{PHOTO_PAUSES.map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
    <label className="formField">Photo framing<select className="input" name="photoFit" value={fit} onChange={e=>setFit(e.target.value)}><option value="fill">Fill the frame (recommended)</option><option value="fit">Show whole photograph</option></select></label>
   </div>
  </section>
  <section id="style" className="card formSection">
   <div className="eyebrow">STEP 04 · YOUR CUSTOMER'S APPROVED DESIGN</div>
   <h2 className="sectionTitle">Prepare one look before the event</h2>
   <p className="sectionLead">Choose the design with the customer, enter their print name, and approve it. This is preloaded on the event iPad for 1 Photo and 4 Photos. Guests cannot switch designs.</p>
   <div className="choiceGrid" role="group" aria-label="Approved keepsake design">
    {styles.map(d=><label className="choice" key={d.id}><input type="radio" name="approvedDesign" value={d.id} checked={selected.id===d.id} onChange={()=>setDesign(d.id)}/><span><strong>{d.name}</strong><small>{d.desc}</small></span></label>)}
   </div>
   <div className="formGrid" style={{marginTop:16}}>
    <label className="formField">Name shown on their printed photos<input className="input" name="nameOnPrint" maxLength={65} placeholder="Leave empty to use event name" value={printName} onChange={e=>setPrintName(e.target.value)}/></label>
    {graduation&&<label className="formField">Graduating class year<input className="input" name="classYear" maxLength={4} inputMode="numeric" pattern="[0-9]{4}" placeholder="2026" value={year} onChange={e=>setYear(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>}
   </div>
   {graduation&&<p className="inlineInfo"><a href="https://photobooth-booth-production.up.railway.app/lamarr-preview" target="_blank" rel="noopener noreferrer">Preview the Navy &amp; Gold one-photo and four-photo layouts ↗</a></p>}
   <h3 style={{fontSize:14,margin:'22px 0 12px'}}>Customer-approved colors</h3>
   <div className="paletteGrid" role="group" aria-label="Event colors">
    {COLORS.map(p=><label key={p.id} className="paletteCard"><input type="radio" name="paletteId" value={p.id} checked={palette===p.id} onChange={()=>choosePalette(p)}/><span className="paletteSwatch" aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.accent}}/></span><span>{p.name}</span></label>)}
   </div>
   <div className="formGrid" style={{marginTop:16}}>
    <label className="formField">Primary color<input className="input colorInput" name="primaryColor" type="color" value={primary} onChange={e=>setPrimary(e.target.value)}/></label>
    <label className="formField">Accent color<input className="input colorInput" name="accentColor" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
   </div>
   <input type="hidden" name="format" value="strip"/>
   <input type="hidden" name="strips" value="1"/>
   <div className="themePreview" style={{'--primary':primary,'--paper':accent}}>
    <div className="themePreviewArtwork" aria-hidden="true">✦</div>
    <div><strong>{selected.name} · customer-approved</strong><p>1 Photo creates a single large keepsake. 4 Photos makes four different poses on one 4×6 sheet.</p><p>Only your staff can change this setup. {pause}-second breaks between poses.</p></div>
   </div>
  </section>
 </>;
}

'use client';
import {useState} from 'react';
import {COLORS,PHOTO_PAUSES} from '../lib/studio-experience.mjs';
export default function ExperienceEditor({initial}){
 const [featured,setFeatured]=useState(initial.featured);
 const [pause,setPause]=useState(initial.pauseSeconds);
 const [format,setFormat]=useState(initial.format);
 const [strips,setStrips]=useState(initial.strips);
 const [fit,setFit]=useState(initial.photoFit);
 const [palette,setPalette]=useState(initial.paletteId);
 const [primary,setPrimary]=useState(initial.primary);
 const [accent,setAccent]=useState(initial.accent);
 function choosePalette(p){setPalette(p.id);setPrimary(p.primary);setAccent(p.accent);}
 return <>
  <section id="experience" className="card formSection">
   <div className="eyebrow">STEP 03 · GUESTS</div><h2 className="sectionTitle">How guests take photos</h2>
   <p className="sectionLead">Both 1 Photo and 4 Photos stay available. Choose which appears as the featured option when a guest arrives.</p>
   <div className="choiceGrid" role="group" aria-label="Featured guest photo experience">
    <label className="choice"><input type="radio" name="featured" value="one" checked={featured==='one'} onChange={()=>setFeatured('one')}/><span><strong>1 Photo</strong><small>Quick portrait · one countdown · one 4×6 card</small></span></label>
    <label className="choice"><input type="radio" name="featured" value="four" checked={featured==='four'} onChange={()=>setFeatured('four')}/><span><strong>4 Photos</strong><small>Four different poses · choose a card or a strip</small></span></label>
   </div>
   <div className="formGrid" style={{marginTop:18}}>
    <label className="formField">Pause between four-photo poses<select className="input" name="pauseSeconds" value={pause} onChange={e=>setPause(Number(e.target.value))}>{PHOTO_PAUSES.map(n=><option key={n} value={n}>{n} seconds</option>)}</select><small>Guests can tap “I’m ready” sooner. The countdown runs after the pause.</small></label>
    <label className="formField">Photo framing<select className="input" name="photoFit" value={fit} onChange={e=>setFit(e.target.value)}><option value="fill">Fill the frame automatically (recommended)</option><option value="fit">Show the whole photo</option></select><small>Fill may trim the edges. Original captures remain unchanged.</small></label>
   </div>
  </section>
  <section id="style" className="card formSection">
   <div className="eyebrow">STEP 04 · STYLE</div><h2 className="sectionTitle">Keepsake design and colors</h2>
   <p className="sectionLead">Choose the featured print format and look. These colors are stored with the admin event; use the booth setup to apply them to the iPad.</p>
   <div className="choiceGrid" role="group" aria-label="Preferred keepsake format">
    <label className="choice"><input type="radio" name="format" value="card" checked={format==='card'} onChange={()=>setFormat('card')}/><span><strong>4×6 Card</strong><small>A full-size keepsake on one sheet</small></span></label>
    <label className="choice"><input type="radio" name="format" value="strip" checked={format==='strip'} onChange={()=>setFormat('strip')}/><span><strong>Photo Strip</strong><small>Four pictures stacked, classic booth style</small></span></label>
   </div>
   <div className="formGrid" style={{marginTop:16}}>
    <label className="formField">Photo strips per 4×6 sheet<select name="strips" className="input" value={strips} onChange={e=>setStrips(Number(e.target.value))}><option value="1">One centered strip (default)</option><option value="2">Two matching strips (optional)</option></select><small>Both choices use one physical print request per session.</small></label>
   </div>
   <h3 style={{fontSize:14,margin:'22px 0 12px'}}>Choose a color palette</h3>
   <div className="paletteGrid" role="group" aria-label="Event colors">
    {COLORS.map(p=><label key={p.id} className="paletteCard"><input type="radio" name="paletteId" value={p.id} checked={palette===p.id} onChange={()=>choosePalette(p)}/><span className="paletteSwatch" aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.accent}}/></span><span>{p.name}</span></label>)}
   </div>
   <div className="formGrid" style={{marginTop:16}}>
    <label className="formField">Primary color<input className="input colorInput" name="primaryColor" type="color" value={primary} onChange={e=>setPrimary(e.target.value)}/></label>
    <label className="formField">Accent color<input className="input colorInput" name="accentColor" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
   </div>
   <div className="themePreview" style={{'--primary':primary,'--paper':accent}}>
    <div className="themePreviewArtwork" aria-hidden="true">✦</div>
    <div><strong>{format==='card'?'4×6 Card':strips===1?'One centered photo strip':'Two matching photo strips'}</strong><p>Style reference only—your real photo is shown on the booth after capturing. {fit==='fill'?'Photos automatically fill each slot.':'Whole photos are kept visible.'}</p><p><strong>{featured==='one'?'1 Photo':'4 Photos'}</strong> featured · {pause}-second break in four-photo sessions.</p></div>
   </div>
  </section>
 </>;
}

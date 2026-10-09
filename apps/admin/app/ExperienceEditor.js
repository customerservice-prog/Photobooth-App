'use client';
import {useEffect,useRef,useState} from 'react';
import {COLORS,PHOTO_PAUSES,approvedDesignFor} from '../lib/studio-experience.mjs';
import {ownerApprovedDesigns,ownerPreviewConfig} from '../lib/owner-design-preview.mjs';
import OwnerDesignPreview,{OwnerDesignArtwork} from './OwnerDesignPreview';

export default function ExperienceEditor({initial,eventType='Other celebration',eventName='',eventDate=''}){
 const editor=useRef(null);
 const [kind,setKind]=useState(eventType),[name,setName]=useState(eventName),[date,setDate]=useState(eventDate);
 const [featured,setFeatured]=useState(initial.featured);
 const [pause,setPause]=useState(initial.pauseSeconds);
 const [fit,setFit]=useState(initial.photoFit);
 const [palette,setPalette]=useState(initial.paletteId);
 const [primary,setPrimary]=useState(initial.primary),[accent,setAccent]=useState(initial.accent);
 const [design,setDesign]=useState(approvedDesignFor(eventType,initial.approvedDesign));
 const [printName,setPrintName]=useState(initial.nameOnPrint||''),[year,setYear]=useState(initial.classYear||'');
 const graduation=/graduation/i.test(kind),styles=ownerApprovedDesigns(kind);
 const selectedDesign=approvedDesignFor(kind,design),selected=styles.find(x=>x.id===selectedDesign)||styles[0];
 const experience={...initial,featured,pauseSeconds:pause,photoFit:fit,paletteId:palette,primary,accent,approvedDesign:selected.id,nameOnPrint:printName,classYear:year};
 const cfg=ownerPreviewConfig({eventType:kind,eventName:name,eventDate:date,experience});
 useEffect(()=>{
  const form=editor.current?.closest('form');
  if(!form)return;
  const update=()=>{
   setKind(form.elements.namedItem('eventType')?.value||eventType);
   setName(form.elements.namedItem('eventName')?.value||'');
   setDate(form.elements.namedItem('date')?.value||'');
  };
  update();form.addEventListener('input',update);form.addEventListener('change',update);
  return()=>{form.removeEventListener('input',update);form.removeEventListener('change',update);};
 },[eventType]);
 useEffect(()=>{if(!graduation&&design==='grad-gala')setDesign('champagne');},[graduation,design]);
 function choosePalette(p){setPalette(p.id);setPrimary(p.primary);setAccent(p.accent);}
 return <div ref={editor} className="ownerDesignEditor">
  <section id="style" className="card formSection ownerDesignSection">
   <div className="eyebrow">CUSTOMER DESIGN</div><h2 className="sectionTitle">Choose their artwork</h2>
   <p className="sectionLead">Approve one look with your customer. It will be ready for both 1 Photo and 4 Photos.</p>
   <div className="ownerDesignWorkspace"><div className="ownerDesignControls">
    <fieldset className="ownerDesignChoices"><legend>Choose one design</legend>
     {styles.map(d=><label className={'ownerDesignChoice'+(selected.id===d.id?' isSelected':'')} key={d.id}>
      <input type="radio" name="approvedDesign" value={d.id} checked={selected.id===d.id} onChange={()=>setDesign(d.id)}/>
      <span className="ownerDesignThumb" aria-hidden="true"><OwnerDesignArtwork cfg={{...cfg,defaultTemplate:d.id}}/></span>
      <span className="ownerDesignChoiceWords"><strong>{d.name}</strong><small>{d.description}</small></span>
      <span className="ownerDesignCheck" aria-hidden="true">{selected.id===d.id?'✓':''}</span>
     </label>)}
    </fieldset>
    <div className="ownerDesignNames">
     <label className="formField">Name on the photos<input className="input" name="nameOnPrint" maxLength={65} placeholder={name||'Use event name'} value={printName} onChange={e=>setPrintName(e.target.value)}/><small>Leave empty to use the event name.</small></label>
     {graduation?<label className="formField">Class year<input className="input" name="classYear" maxLength={4} inputMode="numeric" pattern="[0-9]{4}" placeholder="2026" value={year} onChange={e=>setYear(e.target.value.replace(/\D/g,'').slice(0,4))}/></label>:<input type="hidden" name="classYear" value={year}/>}
    </div>
   </div><OwnerDesignPreview cfg={cfg} designName={selected.name}/></div>
  </section>
  <details id="experience" className="card ownerDesignAdvanced">
   <summary><span>Photo timing, framing &amp; colors</span><small>Optional staff settings</small></summary>
   <div className="ownerDesignAdvancedBody">
    <div className="formGrid">
     <label className="formField">Featured guest choice<select className="input" name="featured" value={featured} onChange={e=>setFeatured(e.target.value)}><option value="one">1 Photo</option><option value="four">4 Photos</option></select><small>Both choices stay available to guests.</small></label>
     <label className="formField">Time between poses<select className="input" name="pauseSeconds" value={pause} onChange={e=>setPause(Number(e.target.value))}>{PHOTO_PAUSES.map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label>
     <label className="formField">Photo framing<select className="input" name="photoFit" value={fit} onChange={e=>setFit(e.target.value)}><option value="fill">Fill the frame</option><option value="fit">Show whole photograph</option></select></label>
    </div>
    <h3>Event colors</h3><div className="paletteGrid" role="group" aria-label="Event colors">{COLORS.map(p=><label key={p.id} className="paletteCard"><input type="radio" name="paletteId" value={p.id} checked={palette===p.id} onChange={()=>choosePalette(p)}/><span className="paletteSwatch" aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.accent}}/></span><span>{p.name}</span></label>)}</div>
    <div className="formGrid" style={{marginTop:16}}>
     <label className="formField">Primary color<input className="input colorInput" name="primaryColor" type="color" value={primary} onChange={e=>setPrimary(e.target.value)}/></label>
     <label className="formField">Accent color<input className="input colorInput" name="accentColor" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
    </div>
    <input type="hidden" name="format" value={initial.format}/><input type="hidden" name="strips" value={initial.strips}/>
   </div>
  </details>
 </div>;
}

'use client';
import {useMemo,useState} from 'react';
import {renderKeepsake} from '../lib/keepsake-designs.mjs';
import {readPreviewPhoto} from '../lib/event-studio.mjs';
import {graduationShowcaseConfig,startGraduationShowcase} from '../lib/graduation-showcase.mjs';
import './grad-preview.css';

function Artwork({title,caption,html,testId}){
 return <article className="gpProof"><div className="gpArtBox" data-testid={testId} dangerouslySetInnerHTML={{__html:html}}/><div className="gpProofCopy"><strong>{title}</strong><span>{caption}</span></div></article>;
}
export default function GraduationPreviewPage(){
 const [name,setName]=useState('LaMarr'),[year,setYear]=useState('2026'),[date,setDate]=useState('October 10, 2026');
 const [previewPhoto,setPreviewPhoto]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const cfg=useMemo(()=>graduationShowcaseConfig({name,year,date}),[name,year,date]);
 const one=useMemo(()=>renderKeepsake({photo:previewPhoto,cfg,template:'grad-gala',layout:'card',id:'grad-proof-one'}),[previewPhoto,cfg]);
 const four=useMemo(()=>renderKeepsake({photo:previewPhoto,poses:previewPhoto?Array(4).fill(previewPhoto):[],cfg,template:'grad-gala',layout:'photo_strip',stripMode:'single',id:'grad-proof-four'}),[previewPhoto,cfg]);
 async function upload(e){
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  setBusy(true);setError('');
  try{setPreviewPhoto(await readPreviewPhoto(file));}
  catch(err){setError(err.message||'Could not open this photo. Try JPG or PNG.');}
  finally{setBusy(false);}
 }
 function openBooth(){
  setError('');
  try{window.location.assign(startGraduationShowcase(localStorage,{name,year,date}));}
  catch{setError('This device could not save the preview. Check Safari storage and try again. No customer event was changed.');}
 }
 return <main className="gpPage" data-testid="graduation-design-preview"><div className="gpWrap">
   <header className="gpHeader"><div><span className="gpOverline">FRIENDLY PHOTO BOOTH · LIVE GRADUATION DESIGN</span><h1>Make it look like <em>the celebration.</em></h1><p>The same artwork appears on the finished 4×6 print, digital download, and booth design screen.</p></div><a className="gpReturn" href="/launch">Back to start</a></header>
   <section className="gpCustomize" aria-label="Personalize the graduation design"><div className="gpStep"><span>01</span><div><strong>Enter the graduate’s details</strong><p>See the name and date update in both layouts.</p></div></div>
    <div className="gpInputs"><label>Graduate’s name<input value={name} maxLength={30} onChange={e=>setName(e.target.value)}/></label><label>Class year<input value={year} inputMode="numeric" maxLength={4} onChange={e=>setYear(e.target.value.replace(/\D/g,'').slice(0,4))}/></label><label>Event date<input value={date} maxLength={50} onChange={e=>setDate(e.target.value)}/></label></div>
    <div className="gpSampleLine"><label className="gpPhotoPick" htmlFor="gpUpload">Add a sample photo (optional)<input id="gpUpload" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy}/></label>{previewPhoto&&<button type="button" className="gpClear" onClick={()=>setPreviewPhoto('')}>Remove sample</button>}<small>{busy?'Preparing photo…':previewPhoto?'Preview only. The four-photo proof repeats this sample for illustration; the real booth captures four different poses.':'No photo? We show placeholder silhouettes until you take a real picture.'}</small></div>
    {error&&<p role="alert" className="gpError">{error}</p>}
   </section>
   <div className="gpStep gpDesignTitle"><span>02</span><div><strong>Compare both real print layouts</strong><p>Navy and orange balloons, metallic-style gold frame, large photographs, class year and personalized name.</p></div></div>
   <section className="gpGallery" aria-label="One-photo and four-photo graduation print proofs">
    <Artwork title="One big photo · 4×6 card" caption="Full portrait, gold frame and celebration name" html={one} testId="graduation-one-proof"/>
    <Artwork title="Four separate poses · 4×6 keepsake" caption="Four large photos taken one after another by the booth" html={four} testId="graduation-four-proof"/>
   </section>
   <section className="gpAction"><div className="gpStep"><span>03</span><div><strong>Try it in the Photo Booth</strong><p>Take one photo or four poses. This opens a separate rehearsal event; it never changes the paid booking or print allowance.</p></div></div><button type="button" className="gpStart" onClick={openBooth}>Use this design — open the Photo Booth <span aria-hidden="true">→</span></button><small>The photo backdrop in your reference is silver sequins. For that exact background, place a real silver sequin backdrop behind the guest; the artwork does not replace their surroundings.</small></section>
 </div></main>;
}

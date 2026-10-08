'use client';
import {useEffect,useRef,useState} from 'react';
import {applyHandoff,decodeHandoff,parseHandoffFile,handoffWorkspaceId} from '../lib/booth-import.mjs';
import {workspace,usage} from '../lib/event-workspace.mjs';
import './load-event.css';
export default function LoadEventPage(){
 const [handoff,setHandoff]=useState(null),[error,setError]=useState(''),[done,setDone]=useState(null),[existing,setExisting]=useState(null);
 const input=useRef(null);
 useEffect(()=>{
  const hash=window.location.hash.replace(/^#/,'');
  if(!hash)return;
  try{
   const token=hash.startsWith('transfer=')?hash.slice(9):hash;
   const payload=decodeHandoff(token);setHandoff(payload);inspect(payload);
   // Remove the encoded setup from history before guests might use this browser.
   window.history.replaceState(null,'',window.location.pathname+window.location.search);
  }catch(e){setError(e.message||'Could not read this event setup.');}
 },[]);
 function inspect(payload){
  const id=handoffWorkspaceId(payload.i);
  const target=workspace('?event='+encodeURIComponent(id));
  try{const present=localStorage.getItem(target.config);
   const used=localStorage.getItem(target.usage);
   if(used!==null)usage(localStorage,target);
   setExisting({loaded:present!==null,printed:used===null?0:Number(used)});
  }catch(e){setExisting({loaded:true,printed:null});setError(e.message||'Review the existing print counter before loading.');}
 }
 async function chooseFile(e){
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  setError('');setDone(null);
  try{if(file.size>6500)throw Error('The setup file is too large. Choose one under 6 KB.');
   const payload=parseHandoffFile(await file.text());
   setHandoff(payload);inspect(payload);
  }catch(err){setHandoff(null);setError(err.message||'This file is not a valid Friendly event setup.');}
 }
 function accept(){
  if(!handoff||existing?.printed===null)return;
  try{const result=applyHandoff(localStorage,handoff);
   setDone({id:result.id,updated:result.updated,home:workspace('?event='+encodeURIComponent(result.id)).home});
   setError('');
  }catch(e){setError(e.message||'The event could not be saved on this device.');}
 }
 const format=handoff?.l==='strip'?(handoff.s===2?'Two matching photo strips':'One centered photo strip'):'4×6 Card';
 return <main className="loadPage">
  <section className="loadCard" aria-label="Load a Friendly Photo Booth event">
   <header className="loadHead"><div className="loadBrand">✦ <span>FRIENDLY <small>PHOTO BOOTH · STAFF</small></span></div><a className="loadBack" href="/">← Guest welcome</a></header>
   <div className="loadIntro"><span className="loadOverline">STEP 02 · SEND TO BOOTH</span><h1>Load your event onto this iPad.</h1><p>Choose the event setup file from your staff dashboard or open its transfer link. Check everything before loading.</p></div>
   {error&&<div className="loadError" role="alert">{error}</div>}
   {done?<section className="loadSuccess" data-testid="handoff-loaded"><span className="loadSuccessMark" aria-hidden="true">✓</span><h2>Event loaded on this device.</h2><p>{handoff?.t} is now available as a separate event. Other event settings, saved photos and print counts were not reset.</p><div className="loadActions"><a className="loadPrimary" href={done.home} data-testid="open-loaded-event">Open event & test →</a><button className="loadSecondary" type="button" onClick={()=>{setDone(null);setHandoff(null);setExisting(null);}}>Load a different event</button></div><small>You can return to this exact event later from its saved URL: {done.home}</small></section>:
   handoff?<section className="loadReview" data-testid="handoff-review">
    <div className="loadReviewHead"><span className="loadOverline">REVIEW BEFORE LOADING</span><h2>{handoff.t}</h2><p>{handoff.d} · {handoff.o||'Celebration'}</p></div>
    <div className="loadFacts">
     <div><small>Featured session</small><strong>{handoff.f===1?'1 Photo':'4 Photos'}</strong></div>
     <div><small>Between poses</small><strong>{handoff.b} seconds</strong></div>
     <div><small>Default print</small><strong>{format}</strong></div>
     <div><small>Photo framing</small><strong>{handoff.x==='fill'?'Fill the frame':'Show whole photo'}</strong></div>
     <div><small>Physical print limit</small><strong>{handoff.p?handoff.n+' sheets':'Digital only'}</strong></div>
     <div><small>Design & colors</small><strong><span className="loadColors" aria-hidden="true"><i style={{background:handoff.c[0]}}/><i style={{background:handoff.c[1]}}/></span>{handoff.g}</strong></div>
    </div>
    {existing?.loaded&&<div className="loadNotice" role="status">This event is already loaded on this device. A new copy updates its event settings only. <strong>{existing.printed===null?'The current print counter needs staff review.':existing.printed+' print requests are recorded and will be preserved.'}</strong> Other events and photos are not changed.</div>}
    <div className="loadActions"><button type="button" disabled={existing?.printed===null} className="loadPrimary" onClick={accept} data-testid="confirm-handoff">{existing?.loaded?'Update this event on this iPad':'Load this event on this iPad'} →</button><button className="loadSecondary" type="button" onClick={()=>{setHandoff(null);setExisting(null);setError('');}}>Choose another setup</button></div>
    <p className="loadFine">This action does not connect to an admin account or give remote control of the iPad. It only installs the displayed settings in this browser.</p>
   </section>:
   <section className="loadChoose">
    <label className="loadFileChoice">Choose a Friendly event setup file<input ref={input} type="file" accept=".json,application/json" onChange={chooseFile} data-testid="handoff-file"/></label>
    <p>From the staff dashboard, select <strong>Send to Booth → Download setup file</strong>, transfer it to this iPad, then select it here.</p>
    <div className="loadNotice"><strong>Using Safari rather than an installed Home Screen app?</strong> You can scan the QR code from the staff event page to open a preview here instead. An installed app may have separate storage, so use the file import inside the installed app.</div>
   </section>}
   <footer className="loadFooter"><span>PRIVATE DEVICE SETTINGS · NO PHOTOS UPLOADED</span><a href="/help">Need help?</a></footer>
  </section>
 </main>;
}

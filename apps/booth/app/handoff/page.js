'use client';
import {useEffect,useState} from 'react';
import {resolveBoothHandoff,applyBoothHandoff} from '../lib/booth-handoff.mjs';
import {workspace,usage} from '../lib/event-workspace.mjs';
import {assignActiveEvent} from '../lib/active-event.mjs';
import './handoff.css';
export default function HandoffPage(){
 const [state,setState]=useState({loading:true,payload:null,error:'',previous:null,used:0});
 const [saving,setSaving]=useState(false);
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  async function open(){try{
   const payload=await resolveBoothHandoff(window.location.hash,{signal:controller.signal});
   const scope=workspace('?booth_event='+encodeURIComponent(payload.id));
   const raw=localStorage.getItem(scope.config);
   let previous=null;
   if(raw!==null){try{previous=JSON.parse(raw);}catch{throw new Error('Saved local event settings are unreadable. Nothing has been changed.');}}
   const used=usage(localStorage,scope);
   if(active)setState({loading:false,payload,error:'',previous,used});
  }catch(error){if(active)setState({loading:false,payload:null,error:error.message||'Could not open this event link.',previous:null,used:0});}}
  void open();return()=>{active=false;controller.abort();};
 },[]);
 function apply(){
  if(!state.payload||saving)return;
  setSaving(true);
  try{
   const result=applyBoothHandoff(localStorage,state.payload);
   try{assignActiveEvent(localStorage,result.scope.id);}catch{}
   // Replace removes the long transfer fragment from the address bar.
   window.location.replace(result.scope.home);
  }catch(error){
   setState(s=>({...s,error:error.message||'The event could not be saved on this device.'}));
   setSaving(false);
  }
 }
 const p=state.payload;
 const ready=Boolean(p);
 return <main className="hbPage">
  <header className="hbHeader"><span className="hbBrand">✦</span><span><strong>FRIENDLY PHOTO BOOTH</strong><small>STAFF → EVENT IPAD</small></span></header>
  <div className="hbWrap">
   <div className="hbKicker">EVENT HANDOFF · STEP 3 OF 4</div>
   <h1>{state.loading?'Opening your event…':p?'Ready to load your event?':'This link needs attention'}</h1>
   {state.error&&<div className="hbError" role="alert">{state.error}</div>}
   {p?<div className="hbCard" data-testid="booth-handoff-review">
    <div className="hbCardHead"><span>EVENT SETTINGS</span><span className="hbDate">{new Date(p.date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</span></div>
    <h2>{p.title}</h2>
    <div className="hbInfo">
     <div><small>Guests can choose</small><strong>1 Photo or 4 Photos</strong><p>{p.f==='one'?'1 Photo':'4 Photos'} featured first</p></div>
     <div><small>Four-photo pose break</small><strong>{p.p} seconds</strong><p>Guests can start sooner</p></div>
     <div><small>Approved event artwork</small><strong>{p.design==='custom'?'Your custom event design':p.design==='grad-gala'?'Navy & Gold Grad Party':p.design==='ivory'?'Classic White':p.design==='blush'?'Midnight':'Celebration'}</strong><p>Automatically used for one-photo and four-photo prints</p></div>
     <div><small>Physical print allowance</small><strong>{p.limit} sheets</strong><p>{p.on?'Printing enabled':'Digital only / printing off'}</p></div>
    </div>
    <div className="hbColors"><span>Event colors</span><div className="hbPaint" aria-hidden="true"><i style={{background:p.a}}/><i style={{background:p.b}}/></div><span>Photo framing: {p.fit==='fill'?'fill each slot':'show whole photo'}</span></div>
    {state.previous&&<div className="hbExisting" role="status"><strong>This event is already on this device.</strong> Applying the new setup updates its settings, but keeps {state.used} previous print request{state.used===1?'':'s'} and all saved photos. {Number.isFinite(Date.parse(state.previous.adminHandoff?.revision))&&new Date(state.previous.adminHandoff.revision)>new Date(p.rev)?'This is an older link. Ask staff for a newer one.':''}</div>}
    {!state.previous&&<div className="hbExisting"><strong>First time on this iPad?</strong> This creates a separate local event and starts its print counter at zero. Your other events are not changed.</div>}
    <div className="hbActions">
     <button className="hbApply" type="button" onClick={apply} disabled={saving} data-testid="booth-handoff-apply">{saving?'Saving on this iPad…':'Apply event to this iPad →'}</button>
     <p>Apply only on the iPad that will take event photos. The event is stored locally so it can still capture photos without internet.</p>
    </div>
   </div>:!state.loading?<div className="hbCard"><p>Open the **Send to Booth** link from the event in the staff dashboard, or scan its QR code using the event iPad.</p><a href="/" className="hbBack">Return to booth welcome</a></div>:null}
   <div className="hbHelp"><span className="hbHelpNumber">4</span><div><strong>Next: Test & Start</strong><p>After applying, test one photo, a four-photo session, the speaker, and a physical 4×6 printer sheet. Never assume the printer is ready just because the setup was transferred.</p></div></div>
  </div>
 </main>;
}

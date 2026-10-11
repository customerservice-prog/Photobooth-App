'use client';
import {useEffect,useRef,useState} from 'react';
import {deliveryReceiptView} from '../lib/delivery-receipt.mjs';
import DeliveryReadinessStatus from './DeliveryReadinessStatus';
import './delivery.css';

export default function DeliveryPanel({photo,title='Your event',test=false,diagnostic=false,artwork=false,inline=false,onBusyChange,onActivityChange}){
 const [config,setConfig]=useState(null),[open,setOpen]=useState(diagnostic||inline),[channel,setChannel]=useState('email'),[recipient,setRecipient]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState(null),[error,setError]=useState(''),[code,setCode]=useState(''),[needsSignIn,setNeedsSignIn]=useState(false);
 const requestId=useRef(null),guard=useRef(false),fixedRequest=useRef(null);
 const available=!!(config?.paired&&(config.email.configured||config.sms.configured));
 const receiptView=deliveryReceiptView(receipt,config);
 async function refresh(){setError('');setNeedsSignIn(false);try{const r=await fetch('/api/delivery/config'+(diagnostic?'?staff=1':''),{cache:'no-store'});const next=await r.json();if(!r.ok){setNeedsSignIn(r.status===401);throw new Error(next.error||'Delivery configuration could not be checked. Your photo is unchanged.');}setConfig(next);setChannel(current=>next[current].configured?current:next.email.configured?'email':'sms');}catch(error){setConfig(null);setError(error.message||'Delivery configuration could not be checked. Your photo is unchanged.');}}
 useEffect(()=>{refresh();},[]);
 useEffect(()=>{requestId.current=null;fixedRequest.current=null;setReceipt(null);setConsent(false);setRecipient('');setError('');},[photo]);
 useEffect(()=>{onBusyChange?.(busy);return()=>onBusyChange?.(false);},[busy,onBusyChange]);
 useEffect(()=>{onActivityChange?.(busy);return()=>onActivityChange?.(false);},[busy,onActivityChange]);
 function change(next){if(guard.current||fixedRequest.current)return;requestId.current=null;setReceipt(null);setError('');setConsent(false);next();}
 function clearRecipient(){if(guard.current)return;requestId.current=null;fixedRequest.current=null;setReceipt(null);setError('');setConsent(false);setRecipient('');}
 async function authorizeStaff(){if(!diagnostic||guard.current)return;guard.current=true;setBusy(true);setError('');try{const r=await fetch('/api/delivery/session/staff',{method:'POST'});const d=await r.json();if(!r.ok){setNeedsSignIn(r.status===401);throw new Error(d.error||'This device could not be enabled for sending.');}await refresh();}catch(e){setError(e.message||'This device could not be enabled for sending.');}finally{guard.current=false;setBusy(false);}}
 async function authorize(e){e.preventDefault();if(guard.current)return;guard.current=true;setBusy(true);setError('');try{const r=await fetch('/api/delivery/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const d=await r.json();if(!r.ok)throw new Error(d.error);setCode('');await refresh();}catch(e){setError(e.message||'Authorization failed.');}finally{guard.current=false;setBusy(false);}}
 async function send(e){e.preventDefault();if(guard.current)return;guard.current=true;setBusy(true);setError('');
  try{
   if(!photo)throw new Error('Wait for the finished keepsake to be prepared.');
   if(!requestId.current)requestId.current=crypto.randomUUID();
   // Freeze the bytes, recipient and ID before a POST. An ambiguous retry uses precisely the same payload.
   if(!fixedRequest.current)fixedRequest.current={channel,recipient,consent,photo,title,test,requestId:requestId.current};
   const r=await fetch('/api/delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixedRequest.current),signal:AbortSignal.timeout(25000)});
   const d=await r.json();if(!r.ok){if([400,401,403,413,415,429].includes(r.status)){fixedRequest.current=null;requestId.current=null;}throw new Error(d.error||'No delivery confirmation is available.');}setReceipt(d);
  }catch(e){setError(['TimeoutError','TypeError'].includes(e.name)?'Connection interrupted. Use Check this request below. The same request is reused; a second message is not sent.':e.message||'No delivery confirmation is available.');}finally{guard.current=false;setBusy(false);}
 }
 async function check(){if(!receiptView.canCheck||guard.current)return;guard.current=true;setBusy(true);setError('');try{const r=await fetch('/api/delivery/status?id='+receipt.id,{headers:{'X-Receipt-Token':receipt.receiptToken},cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setReceipt(d);}catch(e){setError(e.message||'Receipt check unavailable.');}finally{guard.current=false;setBusy(false);}}
 if(!diagnostic&&!available)return null;
 const locked=busy||!!fixedRequest.current;
 return <section className="directDelivery">
  {diagnostic&&<>
   <h2>Send a test photo</h2>
   <p>Use your own email address to check the photo attachment and download link. A message is sent only when you tap Send.</p>
   {needsSignIn&&<a className="action" href={'/staff/sign-in?next='+encodeURIComponent(typeof window==='undefined'?'/delivery-check':window.location.pathname+window.location.search)}>Sign in to enable sending</a>}
   {config&&!config.paired&&<div className="deliveryAuthorization">
    <strong>Enable this device first</strong>
    <p>You are signed in as staff. Tap below to allow sending from this device for 12 hours.</p>
    <button className="action primary" type="button" disabled={busy||!config.dependencies?.configured||!(config.email.configured||config.sms.configured)} onClick={authorizeStaff}>{busy?'Please wait…':'Enable sending on this device'}</button>
    {!config.dependencies?.configured&&<p>Delivery settings need owner setup before this device can send. Open Delivery setup status below.</p>}
    {config.dependencies?.configured&&!(config.email.configured||config.sms.configured)&&<p>Email needs setup before testing. Open Delivery setup status below.</p>}
    <details className="deliveryAdvanced">
     <summary>Advanced: use an owner authorization code</summary>
     <form onSubmit={authorize}>
      <label>Owner authorization code<input type="password" autoComplete="off" value={code} minLength={16} required onChange={e=>setCode(e.target.value)}/></label>
      <p>Use the separate device authorization code provided by the owner. Provider API keys do not belong here.</p>
      <button className="action" disabled={busy||!config.pairingConfigured}>Use owner code</button>
     </form>
    </details>
   </div>}
   {config?.paired&&<p className="deliveryDeviceReady" role="status">This device is enabled for sending.</p>}
  </>}
  {available&&<>{!inline&&!diagnostic&&<button type="button" className="action" disabled={busy} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close delivery':config.email.configured&&config.sms.configured?'Email / Text Keepsake':config.email.configured?'Email Keepsake':'Text Keepsake'}</button>}{open&&<form onSubmit={send} className="deliveryForm">
   <p>{test?'TEST IMAGE — no guest photo.':artwork?'Sends this finished keepsake with your chosen design and photo finish.':'Sends the original photo without a print frame.'}</p>
   {config.email.configured&&config.sms.configured&&<label>Send by<select disabled={locked} value={channel} onChange={e=>change(()=>setChannel(e.target.value))}><option value="email">Email with image attachment</option><option value="sms">Text with private download link</option></select></label>}
   <label>{channel==='email'?'Your email address':'Your mobile number'}<input disabled={locked} autoComplete="off" type={channel==='email'?'email':'tel'} inputMode={channel==='email'?'email':'tel'} value={recipient} required maxLength={254} onChange={e=>change(()=>setRecipient(e.target.value))} placeholder={channel==='email'?'you@example.com':'+1 (555) 123-4567'}/></label>
   <label className="consent"><input disabled={locked} type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>{channel==='email'?'This is my email address. Email me this one keepsake. No marketing signup.':'This is my mobile number. Text me this one keepsake. No marketing signup. Message/data rates may apply.'}</span></label>
   <p className="deliveryPrivacy">Your {channel==='email'?'email includes the photo attachment and a':'text includes a'} private download link that expires after 24 hours. Anyone you forward the link to can download that keepsake.</p>
   <button className="action primary" disabled={busy||!consent||!photo||!config[channel].configured||!!receipt}>{busy?'Please wait…':fixedRequest.current?'Check this request':test?channel==='email'?'Send TEST email':'Send TEST text':'Send my keepsake'}</button>
  </form>}</>}
  {receipt&&<div className="deliveryReceipt" role="status"><strong>{receipt.channel==='email'?'Email':'SMS'} to {receipt.recipient}</strong>{receiptView.canCheck&&<p>Status: {receipt.status}</p>}<p>{receiptView.message}</p>{receiptView.unavailable&&<p>Delivery confirmation is unavailable in this booth.</p>}{receiptView.canCheck&&receipt.receiptCheckUnavailable&&<p>Latest receipt temporarily unavailable; the last recorded status is shown.</p>}{receiptView.canCheck&&<button className="action" disabled={busy} onClick={check}>Check provider receipt</button>}<small>Reference: {receipt.id}</small>{['delivered','opened','clicked','failed','undelivered','bounced','canceled'].includes(receipt.status)&&<button className="action" disabled={busy} onClick={clearRecipient}>Start a new recipient</button>}</div>}
  {error&&<p className="error" role="alert">{error}</p>}
  {diagnostic&&<details className="deliverySetupDetails">
   <summary>Delivery setup status</summary>
   <button className="action" type="button" disabled={busy} onClick={refresh}>Refresh configuration</button>
   {config&&<div className="deliveryConfig"><DeliveryReadinessStatus config={config} staffTest/><p>Download links expire after 24 hours. Limit: {config.limits.email} emails{config.sms.configured?' / '+config.limits.sms+' texts':''} per rolling 24 hours; five per recipient per channel.</p></div>}
  </details>}
 </section>;
}

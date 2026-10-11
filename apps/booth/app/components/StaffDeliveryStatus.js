'use client';
import {useEffect,useState} from 'react';
import DeliveryReadinessStatus from './DeliveryReadinessStatus';

export default function StaffDeliveryStatus({href='/delivery-check'}){
 const [config,setConfig]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[signIn,setSignIn]=useState(false);
 async function refresh(signal){
  setBusy(true);setError('');setSignIn(false);
  try{
   const response=await fetch('/api/delivery/config?staff=1',{cache:'no-store',signal});
   const data=await response.json();
   if(!response.ok){setConfig(null);setSignIn(response.status===401);throw new Error(data.error||'Delivery configuration could not be checked.');}
   setConfig(data);
  }catch(error){if(error.name!=='AbortError'){setConfig(null);setError(error.message||'Delivery configuration could not be checked.');}}
  finally{if(!signal?.aborted)setBusy(false);}
 }
 useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[]);
 return <section className="operatorFold" aria-label="Digital delivery readiness" data-testid="staff-delivery-status">
  <div className="operatorFoldContent">
   <h3>Digital delivery readiness</h3>
   {busy&&!config&&<p role="status">Checking delivery configuration…</p>}
   <DeliveryReadinessStatus config={config}/>
   {error&&<p className="operatorNotice" role="alert">{error}</p>}
   <div className="deliveryStatusActions">
    {signIn?<a href={'/staff/sign-in?next='+encodeURIComponent(href)}>Sign in to view setup</a>:<a href={href}>Open delivery rehearsal</a>}
    <button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?'Checking…':'Refresh configuration'}</button>
   </div>
  </div>
 </section>;
}

'use client';
import {useEffect,useState} from 'react';
import StaffAccessGate from '../../components/StaffAccessGate';
import {returnLabel,safeSignedOutReturnDestination,safeStaffDestination} from '../../lib/staff-navigation.mjs';
import '../../components/guest-first-welcome.css';
import './sign-in.css';

const destinationNames={
 '/setup':'event settings','/event-prep':'event checks','/print-test':'the printer check',
 '/delivery-check':'delivery checks','/test':'booth tests','/designs':'saved layouts',
 '/oct10-demo':'the event preview','/staff/start':'event setup'
};

export default function StaffSignInPage(){
 const [destination,setDestination]=useState('/staff/start'),[back,setBack]=useState('/launch');
 const [ready,setReady]=useState(false),[online,setOnline]=useState(true),[gate,setGate]=useState(true);
 const [checking,setChecking]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const next=safeStaffDestination(new URLSearchParams(window.location.search).get('next'));
  setDestination(next);
  setBack(safeSignedOutReturnDestination(new URL(next,window.location.origin).searchParams.get('returnTo')));
  const updateConnection=()=>setOnline(navigator.onLine!==false);
  updateConnection();setReady(true);
  window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
  return()=>{window.removeEventListener('online',updateConnection);window.removeEventListener('offline',updateConnection);};
 },[]);

 async function continueToDestination(){
  setGate(false);setChecking(true);setError('');
  try{
   // The existing gate can unlock local tools offline. Protected server pages
   // additionally need the signed cookie; confirm it without opening a page loop.
   const response=await fetch('/setup?staff_auth_check=1',{cache:'no-store',credentials:'same-origin',redirect:'follow',signal:AbortSignal.timeout(10000)});
   if(!response.ok||new URL(response.url).pathname!=='/setup')throw new Error('Connect to Wi-Fi and enter your staff PIN again to open these settings.');
   window.location.assign(destination);
  }catch(e){
   setError(e.message==='Connect to Wi-Fi and enter your staff PIN again to open these settings.'?e.message:'Staff sign-in could not connect. Connect to Wi-Fi and try again.');
   setChecking(false);
  }
 }

 const name=destinationNames[destination.split('?')[0]]||'staff tools';
 return <main className="staffSignInPage">
  <header className="staffSignInHeader"><a href="/launch" className="staffSignInBrand">Friendly<span>PHOTO BOOTH</span></a><span>STAFF ACCESS</span></header>
  <section className="staffSignInCard">
   <p className="staffSignInEyebrow">YOU’RE OPENING {name.toUpperCase()}</p>
   <h1>Staff sign-in</h1>
   <p>Enter the staff PIN to continue to {name}. Your event stays selected.</p>
   {!ready?<p role="status">Opening staff sign-in…</p>:checking?<p role="status">Opening {name}…</p>:<>
    {!online&&<p className="staffSignInNotice" role="status">Connect to Wi-Fi to open staff settings. Your saved event and photos are still on this iPad.</p>}
    {error&&<p className="staffSignInNotice" role="alert">{error}</p>}
    <button type="button" className="staffSignInPrimary" disabled={!online} onClick={()=>{setError('');setGate(true);}}>{error?'Try staff PIN again':'Enter staff PIN'}</button>
   </>}
   <a className="staffSignInBack" href={back}>{returnLabel(back)}</a>
  </section>
  <a className="staffSignInStart" href="/launch">Back to booth start</a>
  {ready&&online&&gate&&!checking&&<StaffAccessGate cancelLabel={returnLabel(back)} onClose={()=>window.location.assign(back)} onConfirm={continueToDestination}/>}
 </main>;
}

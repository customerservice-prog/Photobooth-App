'use client';
import {useEffect} from 'react';
const CFG='friendly-booth-event-v1';
const event={title:'Bryan Wedding',subtitle:'A Wedding Celebration',date:'September 19, 2026',type:'wedding'};
export default function BryanWeddingLauncher(){
  useEffect(()=>{
    // Home Screen starts here. Reopening must not erase the customer's saved names or event type.
    try{const saved=JSON.parse(localStorage.getItem(CFG)||'null');if(!saved)localStorage.setItem(CFG,JSON.stringify(event));else if(!saved.type&&saved.title==='Bryan Wedding')localStorage.setItem(CFG,JSON.stringify({...saved,type:'wedding'}))}catch{}
    window.location.replace('/');
  },[]);
  return <main className="booth"><section className="screen"><div className="kicker">Friendly Party Rental</div><h1 className="hero">Opening your booth.</h1><p className="sub">Your saved event details will be kept.</p></section></main>;
}

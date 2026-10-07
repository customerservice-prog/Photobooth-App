'use client';
import {useEffect} from 'react';
import {demoWorkspace} from '../lib/event-workspace.mjs';
export default function October10Demo(){
  useEffect(()=>{window.location.replace(demoWorkspace().home);},[]);
  return <main style={{height:'100dvh',display:'grid',placeItems:'center',background:'#f7f4ed',color:'#243e33',padding:24,textAlign:'center'}}><div><h1 style={{font:'36px Georgia,serif'}}>Opening your office demo…</h1><p>Photos only. Your saved setup and real event print allowance are preserved.</p><a href="/event-prep">Open event preparation</a></div></main>;
}

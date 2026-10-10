'use client';
import {useEffect,useState} from 'react';
import {ACTIVE_EVENT_KEY,activeEventDestination} from '../lib/active-event.mjs';

export default function CurrentEventResume(){
 const [event,setEvent]=useState(null);
 useEffect(()=>{
  try{
   const destination=activeEventDestination(localStorage);
   if(!destination)return;
   const id=localStorage.getItem(ACTIVE_EVENT_KEY);
   const config=JSON.parse(localStorage.getItem('friendly-booth-transfer-v1-'+id+'-config')||'null');
   setEvent({destination,title:typeof config?.title==='string'?config.title:'Current event',date:typeof config?.date==='string'?config.date:''});
  }catch{}
 },[]);
 if(!event)return null;
 return <section className="blCurrent" aria-label="Current event on this iPad">
  <div><span className="blCurrentLabel">CURRENT EVENT ON THIS IPAD</span><strong>{event.title}</strong>{event.date&&<span className="blCurrentDate">{event.date}</span>}</div>
  <a data-testid="launch-resume-current" href={event.destination}>Resume current event <span aria-hidden="true">→</span></a>
  <p>Return to the guest welcome with its saved layout.</p>
 </section>;
}

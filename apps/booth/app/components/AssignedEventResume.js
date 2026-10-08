'use client';
import {useEffect,useState} from 'react';
import {assignedEventUrl,unassignEvent} from '../lib/assigned-event.mjs';

// Runs ONLY on the launch page, not inside the guest camera session.
// Never routes to a demo or restores an event without a saved local config.
export default function AssignedEventResume(){
 const [target,setTarget]=useState(null);
 useEffect(()=>{
  const path=assignedEventUrl(window.localStorage);
  if(path){
   setTarget(path);
   window.location.replace(path);
  }
 },[]);
 if(!target)return null;
 return <div role="status" className="blDetail">Opening the assigned customer event… <a href={target}>Open event</a> <button type="button" onClick={()=>{unassignEvent(localStorage);setTarget(null);}}>Stay on setup screen</button></div>;
}

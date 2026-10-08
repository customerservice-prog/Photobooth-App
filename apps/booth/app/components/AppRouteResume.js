'use client';
import {useEffect} from 'react';
import {activeEventDestination} from '../lib/active-event.mjs';
export default function AppRouteResume(){
 useEffect(()=>{
  const destination=activeEventDestination(localStorage);
  if(destination)window.location.replace(destination);
 },[]);
 return null;
}
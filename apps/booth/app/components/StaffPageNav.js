'use client';
import {useEffect,useState} from 'react';
import {readReturnDestination,returnLabel} from '../lib/staff-navigation.mjs';
import './staff-page-nav.css';
export default function StaffPageNav({label}){
 const [destination,setDestination]=useState(null);
 useEffect(()=>{setDestination(readReturnDestination(window.location.search,localStorage));},[]);
 return <nav className="staffPageNav" aria-label="Booth navigation" aria-busy={!destination}>{destination?<a data-testid="staff-page-back" href={destination}>← {label||returnLabel(destination)}</a>:<span role="status">Opening navigation…</span>}{destination!=='/launch'&&<a href="/launch">Booth start</a>}</nav>;
}

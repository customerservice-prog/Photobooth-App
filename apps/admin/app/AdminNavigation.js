'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {BOOTH_URL} from '../lib/studio-experience.mjs';
const SECTIONS=[
 {label:'EVERYDAY WORK',links:[['/dashboard','⌂','Home'],['/events','◈','Events'],['/booths','▣','My booths'],['/templates','✧','Print designs']]},
 {label:'PHOTOS & PEOPLE',links:[['/photos','▧','Photos & prints'],['/galleries','▦','Galleries'],['/customers','◎','Customers']]},
 {label:'MORE TOOLS',links:[['/employees','♙','Team'],['/reports','▥','Reports'],['/settings','⚙','Settings']]}
];
export default function AdminNavigation({children}){
 const path=usePathname()||'/dashboard';
 const [open,setOpen]=useState(false);
 return <div className="shell">
  <button type="button" className="mobileMenuButton" aria-expanded={open} aria-controls="admin-navigation" onClick={()=>setOpen(!open)}>{open?'×':'☰'} <span>{open?'Close menu':'Menu'}</span></button>
  {open&&<button type="button" className="sideScrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
  <aside className={'side'+(open?' sideOpen':'')} id="admin-navigation">
   <Link href="/dashboard" className="brand" onClick={()=>setOpen(false)}>
    <span className="mark" aria-hidden="true">✦</span>
    <span><strong>Friendly Booth</strong><small>STAFF WORKSPACE</small></span>
   </Link>
   <nav className="nav" aria-label="Admin navigation">
    {SECTIONS.map(section=><div className="navGroup" key={section.label}>
      <span className="navGroupTitle">{section.label}</span>
      {section.links.map(([href,icon,label])=><Link href={href} key={href} className={'navLink'+(path===href||path.startsWith(href+'/')?' isActive':'')} aria-current={path===href||path.startsWith(href+'/')?'page':undefined} onClick={()=>setOpen(false)}>
       <span className="ico" aria-hidden="true">{icon}</span><span>{label}</span>
      </Link>)}
     </div>)}
   </nav>
   <div className="sidefoot"><strong>Need the guest photo booth?</strong><a href={BOOTH_URL} target="_blank" rel="noopener noreferrer">Open guest booth ↗</a><small>Opens separately. Device setup is stored on the iPad.</small></div>
  </aside>
  <div className="content">
   <header className="adminTopbar"><div className="adminBreadcrumb"><span className="adminTopMark" aria-hidden="true">✦</span><span>Photo Booth / Staff workspace</span></div><div className="adminTopActions"><Link href="/events/new" className="topNewEvent">＋ New event</Link><a href={BOOTH_URL} target="_blank" rel="noopener noreferrer" className="topGuestLink">Guest booth ↗</a><form method="POST" action="/api/auth/logout"><button type="submit" className="topGuestLink">Sign out</button></form></div></header>
   {children}
  </div>
 </div>;
}
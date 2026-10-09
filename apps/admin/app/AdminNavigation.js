'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {BOOTH_URL} from '../lib/studio-experience.mjs';
const PRIMARY=[['/dashboard','⌂','Home'],['/events','◈','Events'],['/galleries','▦','Digital galleries']];
const MORE=[['/booths','▣','My booths'],['/templates','✧','Print design records'],['/photos','▧','Photo & print records'],['/customers','◎','Customers'],['/employees','♙','Team'],['/reports','▥','Reports'],['/settings','⚙','Settings']];
export default function AdminNavigation({children}){
 const path=usePathname()||'/dashboard';
 const [open,setOpen]=useState(false);
 return <div className="shell">
  <button type="button" className="mobileMenuButton" aria-expanded={open} aria-controls="admin-navigation" onClick={()=>setOpen(!open)}>{open?'×':'☰'} <span>{open?'Close menu':'Menu'}</span></button>
  {open&&<button type="button" className="sideScrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
  <aside className={'side'+(open?' sideOpen':'')} id="admin-navigation">
   <Link href="/dashboard" className="brand" onClick={()=>setOpen(false)}>
    <span className="mark" aria-hidden="true">✦</span>
    <span><strong>Friendly Booth</strong><small>OWNER WORKSPACE</small></span>
   </Link>
   <nav className="nav" aria-label="Admin navigation">
    <div className="navGroup"><span className="navGroupTitle">YOUR RENTALS</span>{PRIMARY.map(([href,icon,label])=><Link href={href} key={href} className={'navLink'+(path===href||path.startsWith(href+'/')?' isActive':'')} aria-current={path===href||path.startsWith(href+'/')?'page':undefined} onClick={()=>setOpen(false)}>
       <span className="ico" aria-hidden="true">{icon}</span><span>{label}</span>
      </Link>)}</div>
    <details className="ownerMoreTools" key={path} open={MORE.some(([href])=>path===href||path.startsWith(href+'/'))||undefined}><summary>More tools <span aria-hidden="true">+</span></summary><div>{MORE.map(([href,icon,label])=><Link href={href} key={href} className={'navLink'+(path===href||path.startsWith(href+'/')?' isActive':'')} aria-current={path===href||path.startsWith(href+'/')?'page':undefined} onClick={()=>setOpen(false)}><span className="ico" aria-hidden="true">{icon}</span><span>{label}</span></Link>)}</div></details>
   </nav>
   <div className="sidefoot"><strong>Ready for your guests?</strong><a href={BOOTH_URL} target="_blank" rel="noopener noreferrer">Open guest booth ↗</a><small>Load the event on your iPad before guests arrive.</small></div>
  </aside>
  <div className="content">
   <header className="adminTopbar"><div className="adminBreadcrumb"><span className="adminTopMark" aria-hidden="true">✦</span><span>Photo Booth / Owner workspace</span></div><div className="adminTopActions"><a href={BOOTH_URL} target="_blank" rel="noopener noreferrer" className="topGuestLink">Guest booth ↗</a><form method="POST" action="/api/auth/logout"><button type="submit" className="topGuestLink">Sign out</button></form></div></header>
   {children}
  </div>
 </div>;
}

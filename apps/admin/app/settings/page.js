import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {BOOTH_URL,BOOTH_SETUP_URL,BOOTH_PREPARATION_URL,guestHandoffMessage} from '../../lib/studio-experience.mjs';
import {PageHeader,DatabaseError} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function SettingsPage(){
 let org=null,users=[],employees=[],booths=[],error=null;
 try{org=await prisma.organization.findFirst();if(org)[users,employees,booths]=await Promise.all([
  prisma.user.findMany({where:{organizationId:org.id},orderBy:{name:'asc'},take:100}),
  prisma.employee.findMany({where:{organizationId:org.id},orderBy:{name:'asc'},take:100}),
  prisma.booth.findMany({where:{organizationId:org.id},include:{devices:true}})
 ])}catch(e){error=e}
 return <main className="page">
  <PageHeader eyebrow="SETTINGS & SUPPORT" title="Booth settings, made simple" subtitle="Find the equipment and staff information that matters. Changes to event names, colors and print options are made from the Events page."><Link className="btn" href="/events">Manage events →</Link></PageHeader>
  {error?<DatabaseError topic="admin settings"/>:<div className="uiGrid">
   <div className="uiStack">
    <section className="card cardPad"><div className="eyebrow">YOUR BUSINESS</div><h2 className="sectionTitle">{org?.name||'Friendly Party Rental'}</h2><p className="sectionLead">Photo booth operations · Syracuse, New York · Canon SELPHY 4×6 printing.</p><div className="buttonRow"><Link href="/booths" className="btn btn2 btnSm">My booths</Link><Link href="/employees" className="btn btn2 btnSm">Team</Link></div></section>
    <section className="card cardPad"><div className="eyebrow">PEOPLE & EQUIPMENT</div><h2 className="sectionTitle">What’s registered</h2><div className="keyValue"><div><small>Admin user records</small><strong>{users.length}</strong></div><div><small>Employee records</small><strong>{employees.length}</strong></div><div><small>Booths</small><strong>{booths.length}</strong></div><div><small>Paired devices</small><strong>{booths.reduce((n,b)=>n+b.devices.length,0)}</strong></div></div></section>
    <section className="card cardPad"><div className="eyebrow">IMPORTANT: DEVICE HANDOFF</div><h2 className="sectionTitle">Admin and iPad settings</h2><p className="sectionLead">{guestHandoffMessage()}</p><div className="buttonRow"><a className="btn btn2" href={BOOTH_SETUP_URL} target="_blank" rel="noopener noreferrer">General booth setup ↗</a><a className="btn btn2" href={BOOTH_PREPARATION_URL} target="_blank" rel="noopener noreferrer">October event preparation ↗</a></div></section>
   </div>
   <div className="uiStack">
    <section className="card cardPad softCard"><div className="eyebrow">HARDWARE CHECKLIST</div><h2 className="sectionTitle">Before the next event</h2><div className="stepList">{['Use the exact iPad and SELPHY for the event','Charge the iPad and connect power','Confirm the right event names and colors','Test one photo and four photos','Make and inspect one physical 4×6 print','Check extra ink and paper','Set up Guided Access on the iPad'].map((x,i)=><div className="stepItem" key={x}><span className="stepIcon">{i+1}</span><strong className="stepItemBody">{x}</strong></div>)}</div><a className="btn" href={BOOTH_URL} target="_blank" rel="noopener noreferrer">Open guest booth ↗</a></section>
    <section className="card cardPad"><div className="eyebrow">SECURITY CHECK</div><h2 className="sectionTitle">Staff access protection</h2><p className="sectionLead">This admin UI currently has no independently verified login/role enforcement in its page routes. A friendly navigation menu is not access control. Protect the admin service with proper authentication before sharing the URL.</p><div className="warningNote">Staff records and printed customer information need restricted access. Do not treat this interface as owner-only until that protection is configured and tested.</div></section>
   </div>
  </div>}
 </main>;
}
import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,Metric,DatabaseError,EmptyState} from '../StudioUI';
import {dateLabel} from '../../lib/studio-experience.mjs';
export const dynamic='force-dynamic';
export default async function EmployeesPage(){
 let employees=[],checklists=[],error=null;
 try{[employees,checklists]=await Promise.all([
  prisma.employee.findMany({orderBy:{name:'asc'},take:100}),
  prisma.eventSetupChecklist.findMany({include:{event:true,employee:true},orderBy:{updatedAt:'desc'},take:30})
 ]);}catch(e){error=e;}
 const active=employees.filter(e=>e.active).length,open=checklists.filter(c=>!c.completedAt).length;
 return <main className="page">
  <PageHeader eyebrow="THE TEAM" title="Team & event handoff" subtitle="See who is on your staff list, which events have setup checklists, and what to test before guests arrive."><Link className="btn btn2" href="/settings">More settings →</Link></PageHeader>
  {error?<DatabaseError topic="team records"/>:<>
   <div className="metricGrid"><Metric label="Team members" value={employees.length}/><Metric label="Active in database" value={active}/><Metric label="Open event checklists" value={open}/><Metric label="Checklist records" value={checklists.length}/></div>
   <div className="uiGrid">
    <section className="card cardPad"><div className="eyebrow">STAFF DIRECTORY</div><h2 className="sectionTitle">Team members</h2>
     {employees.length?<div className="rowList">{employees.map(e=><div className="listRow" key={e.id}><div><strong className="rowTitle">{e.name}</strong><p className="rowSubtitle">{e.email} · {e.phone||'No phone'} · {e.role}</p></div><span className={'statusChip'+(e.active?'':' neutral')}>{e.active?'Active':'Disabled'}</span></div>)}</div>:<EmptyState title="No team members listed" description="Staff access records have not been added. This page does not grant access or set PINs."/>}
     <div className="helpNote" style={{marginTop:15}}>Staff access and PINs must be managed securely. This directory is read-only; no staff credentials are shown here.</div>
    </section>
    <aside className="card cardPad softCard"><div className="eyebrow">EVENT HANDOFF</div><h2 className="sectionTitle">Recent setup checklists</h2>
     {checklists.length?<div className="rowList">{checklists.slice(0,10).map(c=><Link className="listRow" href={'/events/'+c.eventId} key={c.id}><div><strong className="rowTitle">{c.event?.name||'Event'}</strong><p className="rowSubtitle">{c.employee?.name||'Operator not assigned'} · {c.event?.date?dateLabel(c.event.date):'Date unavailable'}</p></div><span className={'statusChip'+(c.completedAt?'':' warning')}>{c.completedAt?'Done':'Open'}</span></Link>)}</div>:<p className="sectionLead">No event checklists saved yet. Start with a real iPad camera and printer test.</p>}
    </aside>
   </div>
   <section className="card cardPad" style={{marginTop:20}}><div className="eyebrow">BEFORE EVERY EVENT</div><h2 className="sectionTitle">Simple five-point staff check</h2><div className="uiCards">{['Charge the iPad and connect its power supply','Open the correct event in Friendly Photo Booth','Test the speaker and take one photo','Take a four-photo strip and print a real 4×6 sheet','Check paper, ink, Wi-Fi and iPad Guided Access'].map((item,i)=><div className="stepItem" key={item}><span className="stepIcon">{i+1}</span><strong className="stepItemBody">{item}</strong></div>)}</div></section>
  </>}
 </main>;
}
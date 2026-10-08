import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,Metric,DatabaseError,EmptyState} from '../StudioUI';
import {dateLabel} from '../../lib/studio-experience.mjs';
export const dynamic='force-dynamic';
export default async function CustomersPage(){
 let customers=[],error=null;
 try{customers=await prisma.customer.findMany({include:{events:{include:{sessions:true},orderBy:{date:'desc'}}},orderBy:{updatedAt:'desc'},take:100})}catch(e){error=e;}
 const events=customers.reduce((n,c)=>n+c.events.length,0),returning=customers.filter(c=>c.events.length>1).length;
 return <main className="page">
  <PageHeader eyebrow="CUSTOMERS" title="Your customers" subtitle="Find customer contact details and their previous photo booth events without switching between pages."><Link href="/events/new" className="btn">＋ Book a new event</Link></PageHeader>
  {error?<DatabaseError topic="customer records"/>:<>
   <div className="metricGrid"><Metric label="Customer records" value={customers.length}/><Metric label="Linked events" value={events}/><Metric label="Returning customers" value={returning}/><Metric label="Recent records shown" value={customers.length} foot="Up to 100"/></div>
   {customers.length?<div className="uiCards">{customers.map(c=>{const latest=c.events[0],count=c.events.reduce((n,e)=>n+e.sessions.length,0);return <article className="card cardPad" key={c.id}><div className="eyebrow">CUSTOMER</div><h2 className="sectionTitle">{c.name}</h2><p className="rowSubtitle">{c.email||'No email provided'}</p><p className="rowSubtitle">{c.phone||'No phone provided'}</p><div className="uiDivider"/><div className="keyValue"><div><small>Events</small><strong>{c.events.length}</strong></div><div><small>Guest sessions</small><strong>{count}</strong></div></div>{latest?<><p className="sectionLead" style={{marginTop:15}}>Most recent: <strong>{latest.name}</strong><br/>{dateLabel(latest.date)}</p><Link className="btn btn2 btnSm" href={'/events/'+latest.id}>Open latest event →</Link></>:<p className="sectionLead">No event linked yet.</p>}</article>})}</div>:<EmptyState title="No customers added" description="Customers are saved when you create their first photo booth event." href="/events/new" label="Create event"/>}
  </>}
 </main>;
}
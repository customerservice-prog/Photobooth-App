import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {readiness,toLocalDay} from '../../lib/studio-experience.mjs';
import {PageHeader,EventTile,EmptyState,DatabaseError} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function EventsPage({searchParams={}}){
 const query=String(searchParams.q||'').trim().slice(0,100);
 const filter=['upcoming','needs','all','completed'].includes(searchParams.filter)?searchParams.filter:'upcoming';
 let events=[],error=null;
 try{events=await prisma.event.findMany({include:{customer:true,booth:true,template:true},orderBy:{date:'asc'},take:200})}catch(e){error=e}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const matches=events.filter(e=>{
  const text=[e.name,e.venueName,e.customer?.name,e.customer?.email,e.booth?.name].filter(Boolean).join(' ').toLowerCase();
  const inSearch=!query||text.includes(query.toLowerCase());
  if(!inSearch)return false;
  if(filter==='needs')return !readiness(e).ready&&!['COMPLETED','ARCHIVED'].includes(e.status);
  if(filter==='upcoming')return toLocalDay(e.date)>=today&&!['COMPLETED','ARCHIVED'].includes(e.status);
  if(filter==='completed')return ['COMPLETED','ARCHIVED'].includes(e.status);
  return true;
 });
 const filterUrl=(kind)=>'/events?filter='+kind+(query?'&q='+encodeURIComponent(query):'');
 return <main className="page">
  <PageHeader eyebrow="YOUR EVENTS" title="Find an event. Finish its setup." subtitle="Every event shows what is ready and what needs attention. Choose an event to see everything in one place."><Link className="btn" href="/events/new">＋ New event</Link></PageHeader>
  <form className="searchBar" action="/events" method="get">
   <input type="hidden" name="filter" value={filter}/>
   <input className="input" type="search" name="q" defaultValue={query} placeholder="Search event, customer or venue" aria-label="Search events"/>
   <button type="submit" className="btn">Search</button>
   {query&&<Link href={'/events?filter='+filter} className="btn btn2">Clear</Link>}
  </form>
  <nav className="filterLinks" aria-label="Event filters">{[['upcoming','Upcoming'],['needs','Needs setup'],['all','All events'],['completed','Completed']].map(([kind,label])=><Link key={kind} href={filterUrl(kind)} className={filter===kind?'isSelected':''} aria-current={filter===kind?'page':undefined}>{label}</Link>)}</nav>
  {error?<DatabaseError topic="events"/>:<section style={{marginTop:21}}>
    <p className="rowSubtitle" style={{marginBottom:13}}>{matches.length} matching event{matches.length===1?'':'s'}{events.length>=200?' · showing up to 200 most relevant records':''}</p>
    {matches.length?<div className="eventTiles">{matches.map(event=><EventTile key={event.id} event={event}/>)}</div>:<EmptyState title={query?'No matching events':'Nothing in this view yet'} description={query?'Try a different event name, customer or venue.':'Choose another filter or create a new event to get started.'} href={query?'/events?filter=all':'/events/new'} label={query?'Show all events':'Create an event →'}/>}
   </section>}
 </main>;
}
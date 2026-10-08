import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,Metric,DatabaseError,EmptyState} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function GalleriesPage(){
 let galleries=[],events=[],error=null;
 try{[galleries,events]=await Promise.all([
  prisma.gallery.findMany({include:{event:{include:{customer:true,sessions:{include:{renderedPhotos:true}}}}},orderBy:{createdAt:'desc'},take:100}),
  prisma.event.findMany({where:{galleryEnabled:true},include:{galleries:true},orderBy:{date:'desc'},take:100})
 ]);}catch(e){error=e;}
 const missing=events.filter(e=>!e.galleries?.length);
 return <main className="page">
  <PageHeader eyebrow="PHOTO COLLECTIONS" title="Event galleries" subtitle="Keep customer photos organized and know whether a gallery is public, private or disabled."><Link href="/photos" className="btn btn2">Photos & prints</Link></PageHeader>
  {error?<DatabaseError topic="galleries"/>:<>
   <div className="metricGrid"><Metric label="Active galleries" value={galleries.filter(g=>!g.disabled).length}/><Metric label="Private" value={galleries.filter(g=>g.privacy==='PRIVATE').length}/><Metric label="PIN protected" value={galleries.filter(g=>g.privacy==='PIN_PROTECTED').length}/><Metric label="Events without gallery" value={missing.length}/></div>
   <div className="uiCards">{galleries.map(g=>{const n=g.event?.sessions?.reduce((sum,s)=>sum+(s.renderedPhotos?.length||0),0)||0;return <article className="card cardPad" key={g.id}>
    <div className="sectionHeader"><span className="eyebrow">{g.privacy.replaceAll('_',' ')}</span><span className={'statusChip'+(g.disabled?' neutral':'')}>{g.disabled?'Disabled':'Recorded active'}</span></div>
    <h2 className="sectionTitle">{g.event?.name||'Event gallery'}</h2><p className="rowSubtitle">{g.event?.customer?.name||'Customer'} · {n} rendered image{n===1?'':'s'}</p>
    <div className="helpNote" style={{marginTop:14}}>Gallery reference: <strong>{g.slug}</strong>. Check privacy and visitor access before sharing a link.</div>
    <div className="buttonRow" style={{marginTop:15}}><Link className="btn btn2 btnSm" href={'/events/'+g.eventId}>Open event →</Link><Link className="btn btn2 btnSm" href="/photos">View photos</Link></div>
   </article>})}</div>
   {!galleries.length&&<EmptyState title="No galleries recorded" description="Galleries can be created as part of your event workflow. This page does not publish or expose photos by itself."/>}
   {missing.length>0&&<section className="card cardPad" style={{marginTop:20}}><div className="eyebrow">NEEDS A LOOK</div><h2 className="sectionTitle">Events without gallery records</h2><div className="rowList">{missing.slice(0,12).map(e=><Link className="listRow" href={'/events/'+e.id} key={e.id}><span className="rowTitle">{e.name}</span><span className="stepArrow">→</span></Link>)}</div></section>}
  </>}
 </main>;
}
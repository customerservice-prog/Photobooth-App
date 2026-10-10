import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,EmptyState,DatabaseError} from '../StudioUI';
import {BOOTH_START_URL} from '../../lib/studio-experience.mjs';
export const dynamic='force-dynamic';
export default async function TemplatesPage(){
 let designs=[],error=null;
 try{designs=await prisma.template.findMany({where:{archived:false},orderBy:{name:'asc'}})}catch(e){error=e}
 return <main className="page">
  <Link href="/dashboard" className="btnPlain ownerBackLink">← Back to workspace</Link>
  <PageHeader eyebrow="PRINT DESIGN RECORDS" title="Print designs" subtitle="Choose the customer’s actual print design during event setup. Older design records are listed below."><a href={BOOTH_START_URL} className="btn" data-testid="templates-start-event">Choose event print design →</a><Link className="btn btn2" href="/templates/new">＋ Register a design record</Link></PageHeader>
  <div className="helpNote" style={{marginBottom:19}}><strong>Ready to choose a guest design?</strong> On the event iPad, open event setup, choose the booking and pick one layout or Custom. These older admin records are separate from the event’s selected printable artwork.</div>
  {error?<DatabaseError topic="print designs"/>:designs.length?<div className="uiCards">{designs.map(d=>{
   const complete=Array.isArray(d.layout?.layers)&&d.layout.layers.length>0;
   const type=d.format==='2x6_strip'?'Photo Strip':d.format==='4x6_landscape'?'4×6 Landscape':'4×6 Portrait';
   return <article className="card cardPad" key={d.id}><div className="sectionHeader"><div className="eyebrow">{d.category}</div><span className={'statusChip'+(complete?'':' warning')}>{complete?'Artwork on file':'Blank canvas'}</span></div>
    <div style={{height:157,border:'1px solid #d5ddcc',borderRadius:11,background:'linear-gradient(135deg,#e5ebdc,#f8e6c3)',display:'grid',placeItems:'center',margin:'12px 0',color:'#356149'}}>
     {d.previewImageUrl?<img src={d.previewImageUrl} alt={'Preview of '+d.name} style={{maxHeight:147,maxWidth:'100%',objectFit:'contain'}}/>:<div style={{textAlign:'center'}}><span style={{display:'block',font:'italic 48px Georgia,serif'}}>✦</span><small>{complete?'Design record':'No artwork preview uploaded'}</small></div>}
    </div>
    <h2 className="sectionTitle">{d.name}</h2><p className="rowSubtitle">{type} · {complete?d.layout.layers.length+' layout elements':'No print elements created yet'}</p>
    <div className="noticeOnly" style={{marginTop:13}}>{complete?'Check its actual printed output before using it with guests.':'Creating this template added a blank canvas, not a finished print layout.'}</div>
   </article>;
  })}</div>:<EmptyState title="No older design records" description="Open event setup on the booth iPad to choose one of the ready-made designs or Custom for your customer’s booking." href="/events" label="Choose a saved event →"/>}
 </main>;
}

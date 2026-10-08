import Link from 'next/link';
import {prisma} from '../../lib/prisma';
import {PageHeader,EmptyState,DatabaseError,StateTag} from '../StudioUI';
export const dynamic='force-dynamic';
export default async function BoothsPage(){
 let booths=[],error=null;
 try{booths=await prisma.booth.findMany({include:{
  devices:true,events:{orderBy:{date:'asc'},take:3},
  heartbeats:{orderBy:{createdAt:'desc'},take:1}
 },orderBy:{name:'asc'}})}catch(e){error=e}
 return <main className="page">
  <PageHeader eyebrow="YOUR EQUIPMENT" title="My photo booths" subtitle="Find each registered booth, its assigned events and its last reported status. A stored “Online” label is not a live connection test."><Link href="/booths/new" className="btn">＋ Add a booth</Link></PageHeader>
  {error?<DatabaseError topic="photo booths"/>:<>
   {booths.length?<div className="uiCards">{booths.map(b=>{
    const last=b.heartbeats?.[0],recent=last&&Date.now()-new Date(last.createdAt).getTime()<15*60*1000;
    return <article className="card cardPad" key={b.id}><div className="sectionHeader"><div style={{width:47,height:47,borderRadius:13,display:'grid',placeItems:'center',color:'#285c41',background:'#e7f0e6',fontSize:25}}>▣</div><span className={'statusChip'+(recent?'':' neutral')}>{recent?'Recent check-in':b.status==='MAINTENANCE'?'Maintenance':'No recent check-in'}</span></div>
     <h2 className="sectionTitle" style={{marginTop:10}}>{b.name}</h2><p className="rowSubtitle">{b.devices.length} paired device{b.devices.length===1?'':'s'} · {b.printerAdapter==='canon_selphy'?'Canon SELPHY':b.printerAdapter}</p>
     <div className="rowList" style={{marginTop:13}}>
      <div className="listRow"><span className="rowMeta">Recorded status</span><strong>{b.status}</strong></div>
      <div className="listRow"><span className="rowMeta">Last report</span><strong>{last?new Date(last.createdAt).toLocaleString('en-US'):'Not reported'}</strong></div>
      <div className="listRow"><span className="rowMeta">Software version</span><strong>{last?.appVersion||b.softwareVersion||'Not reported'}</strong></div>
     </div>
     <div className="helpNote" style={{marginTop:12}}>{last?.printerStatus?'Printer reported: '+last.printerStatus+'. ':'No verified live printer status. '}Run a physical test print on the assigned iPad before leaving.</div>
     {b.events?.length>0&&<div style={{marginTop:15}}><strong>Assigned events</strong><div className="rowList">{b.events.map(e=><Link href={'/events/'+e.id} className="listRow" key={e.id}><span className="rowTitle">{e.name}</span><span className="stepArrow">→</span></Link>)}</div></div>}
    </article>;
   })}</div>:<EmptyState title="No booths registered" description="Add the iPad booth that you plan to use. Registration creates an equipment record; it doesn’t connect the device automatically." href="/booths/new" label="Add first booth"/>}
  </>}
 </main>;
}
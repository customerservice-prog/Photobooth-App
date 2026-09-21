'use client';
// Shared verbatim layout for guest prints and the printer rehearsal. No printer success is inferred here.
export default function PrintCard({photo,cfg,monogram,template='ivory',filter='none'}){
  return <div className={`print luxuryPrint template-${template} ${cfg.title.length>80?'titleExtraLong':cfg.title.length>44?'titleLong':''}`} data-event={cfg.type||'other'}>
    <div className="photoFrame"><img src={photo} alt="Your captured photo" style={{filter}}/></div>
    <div className="printText"><PrintMotif type={cfg.type||'other'}/><strong>{cfg.title}</strong><small>{cfg.subtitle}</small><span className="printDate">{cfg.date}</span><span className="printMonogram">{monogram}</span></div>
  </div>;
}
function PrintMotif({type}){
  const common={className:'printMotif',viewBox:'0 0 72 36',fill:'none',stroke:'currentColor',strokeWidth:'1.5','aria-hidden':true};
  if(type==='wedding')return <svg {...common}><circle cx="29" cy="21" r="10"/><circle cx="43" cy="21" r="10"/><path d="m24 10 5-6 5 6M38 10l5-6 5 6"/></svg>;
  if(type==='birthday')return <svg {...common}><ellipse cx="27" cy="12" rx="7" ry="9"/><ellipse cx="44" cy="14" rx="7" ry="9"/><path d="M27 21c6 6-6 7 0 13m17-11c-6 4 5 6 0 11"/></svg>;
  if(type==='graduation')return <svg {...common}><path d="m15 13 21-9 21 9-21 9-21-9Zm9 5v8c8 5 16 5 24 0v-8m9-5v16"/></svg>;
  return <svg {...common}><path d="M14 18h16m12 0h16m-22-6 6 6-6 6-6-6 6-6Z"/></svg>;
}

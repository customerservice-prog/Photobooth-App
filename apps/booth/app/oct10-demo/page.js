'use client';
import {useEffect} from 'react';

const CFG='friendly-booth-event-v1';
const PRINT_USAGE='friendly-booth-print-usage-v1';

export default function October10Demo(){
  useEffect(()=>{
    const cfg={
      title:'October 10 Photo Booth Party',
      subtitle:'Your Photo Booth Preview',
      date:'October 10, 2026',
      type:'other',
      setupComplete:true,
      defaultTemplate:'champagne',
      photoFit:'fit',
      details:{
        eventName:'October 10 Photo Booth Party',
        subtitle:'4–8 PM',
        primaryColor:'#24352f',
        secondaryColor:'#d8c49b'
      },
      printPackage:{
        includedPrints:108,
        addOnPrints:108,
        addOn54Price:35,
        addOn108Price:60,
        shotsPerSession:4,
        copiesPerSession:1,
        digitalEnabled:true,
        printingEnabled:true
      }
    };
    try{
      localStorage.setItem(CFG,JSON.stringify(cfg));
      localStorage.setItem(PRINT_USAGE,'0');
    }catch{}
    window.location.replace('/');
  },[]);
  return <main style={{minHeight:'100dvh',display:'grid',placeItems:'center',background:'#f4f1e9',color:'#24352f',fontFamily:'system-ui,sans-serif'}}>
    <div style={{textAlign:'center',padding:24}}>
      <h1 style={{fontFamily:'Georgia,serif',fontWeight:400}}>Preparing the October 10 preview…</h1>
      <p>4 poses · 216 physical prints available · digital copies included</p>
    </div>
  </main>;
}

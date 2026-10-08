'use client';
import {useMemo} from 'react';
import {renderLamarrFour,renderLamarrOne} from '../lib/lamarr-graduation.mjs';
const cfg={type:'graduation',title:'LaMarr',date:'October 10th, 2026',details:{graduate:'LaMarr',classYear:'2026',primaryColor:'#061b3b',secondaryColor:'#f77b13'}};
function Preview({title,art,caption}){
 return <article style={{flex:'1 1 310px',minWidth:0,background:'#122c4b',padding:16,border:'1px solid #48678e',borderRadius:18}}>
  <h2 style={{fontSize:21,margin:'0 0 6px'}}>{title}</h2><p style={{fontSize:13,color:'#d5deed',margin:'0 0 12px'}}>{caption}</p>
  <div style={{width:'100%',maxWidth:460,margin:'auto',aspectRatio:'2 / 3',background:'#061b3b',boxShadow:'0 12px 30px #0008'}} dangerouslySetInnerHTML={{__html:art.replace('<svg ','<svg style="width:100%;height:100%;display:block" ')}}/>
 </article>;
}
export default function LamarrPreview(){
 const four=useMemo(()=>renderLamarrFour([],cfg),[]),one=useMemo(()=>renderLamarrOne(null,cfg),[]);
 return <main style={{minHeight:'100dvh',overflowY:'auto',background:'#071225',padding:'clamp(12px,3vw,32px)',color:'white',fontFamily:'system-ui,sans-serif'}}>
  <section style={{maxWidth:1050,margin:'auto'}}>
   <header style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap',alignItems:'center',marginBottom:20}}>
    <div><p style={{color:'#ffad56',letterSpacing:2,fontSize:12,margin:0}}>FRIENDLY PHOTO BOOTH · CUSTOMER PREVIEW</p><h1 style={{fontSize:'clamp(26px,4vw,40px)',margin:'8px 0'}}>LaMarr's Graduation</h1><p style={{color:'#e8d2a9',margin:0}}>Saturday, October 10, 2026 · navy blue, orange and gold</p></div>
    <a href="/" style={{background:'#fff',color:'#092347',padding:'13px 17px',borderRadius:10,textDecoration:'none',fontWeight:700}}>Back to booth</a>
   </header>
   <div style={{display:'flex',gap:18,alignItems:'stretch',flexWrap:'wrap'}}>
    <Preview title="Four separate photos" art={four} caption="Four actual guest poses will replace these numbered sample boxes."/>
    <Preview title="One large photo" art={one} caption="One guest photo fills the gold-bordered portrait frame."/>
   </div>
   <aside style={{marginTop:20,padding:18,background:'#142b4b',borderRadius:14,border:'1px solid #415b7e'}}>
    <strong>Event rehearsal • Fictional address: 100 Celebration Lane, Syracuse, NY 13202 • Sample contact: lamarr-demo@example.com</strong>
    <p style={{lineHeight:1.6}}>This is the real app's artwork output, shown side by side on your iPad. It does not use a customer's email or photographs. It is a live design preview, not a confirmation of AirPrint or borderless printing.</p>
    <a href="/print-test" style={{display:'inline-block',background:'#ff942c',color:'#0a2346',padding:'13px 18px',textDecoration:'none',borderRadius:10,fontWeight:700}}>Open physical printer test</a>
   </aside>
  </section>
 </main>;
}

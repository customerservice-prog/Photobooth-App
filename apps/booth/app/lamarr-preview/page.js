'use client';
import {useMemo,useState} from 'react';
import {renderLamarrFour,renderLamarrOne} from '../lib/lamarr-graduation.mjs';
const cfg={type:'graduation',title:'LaMarr',date:'October 10th, 2026',details:{graduate:'LaMarr',classYear:'2026',primaryColor:'#071d41',secondaryColor:'#f77b13'}};
export default function LamarrPreview(){
 const [mode,setMode]=useState('four');
 const artwork=useMemo(()=>mode==='four'?renderLamarrFour([],cfg):renderLamarrOne(null,cfg),[mode]);
 return <main style={{minHeight:'100dvh',overflowY:'auto',background:'#061225',padding:'clamp(15px,3vw,35px)',color:'white',fontFamily:'system-ui,sans-serif'}}>
 <section style={{maxWidth:1050,margin:'0 auto'}}>
  <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap',marginBottom:18}}>
   <div><p style={{fontSize:12,letterSpacing:3,color:'#ffb85a'}}>FRIENDLY PHOTO BOOTH</p><h1 style={{fontSize:'clamp(23px,3vw,38px)',margin:'4px 0'}}>LaMarr's graduation prints</h1><p style={{color:'#d3dbe7',margin:'4px 0'}}>Live rendering preview of the current app templates · October 10th, 2026</p></div>
   <a href="/" style={{background:'#fff',color:'#102341',borderRadius:12,padding:'12px 16px',textDecoration:'none'}}>Back to Photo Booth</a>
  </header>
  <nav style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:18}}>
   <button type="button" aria-pressed={mode==='four'} onClick={()=>setMode('four')} style={{background:mode==='four'?'#fb8319':'#203657',color:'white',border:'1px solid #ffb25a',borderRadius:12,padding:'15px 22px',fontSize:18,fontWeight:700}}>Four photos</button>
   <button type="button" aria-pressed={mode==='one'} onClick={()=>setMode('one')} style={{background:mode==='one'?'#fb8319':'#203657',color:'white',border:'1px solid #ffb25a',borderRadius:12,padding:'15px 22px',fontSize:18,fontWeight:700}}>One photo</button>
  </nav>
  <div style={{display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap'}}>
   <div style={{width:'min(100%,470px)',aspectRatio:'2 / 3',background:'#fff',overflow:'hidden',border:'4px solid #f8bd69',boxShadow:'0 20px 50px #0009'}} dangerouslySetInnerHTML={{__html:artwork.replace('<svg ','<svg style="width:100%;height:100%;display:block" ')}}/>
   <aside style={{flex:'1 1 240px',maxWidth:420,background:'#132a4c',border:'1px solid #60718a',borderRadius:18,padding:22}}>
    <h2 style={{fontSize:23,margin:'0 0 12px'}}>Actual app design</h2>
    <p style={{lineHeight:1.65}}>This preview uses the same artwork renderer as the finished photo, saved JPEG and print. The boxes are placeholders; the camera fills them with {mode==='four'?'four separate guest photos':'one guest photo'} during a real session.</p>
    <p style={{lineHeight:1.65}}>This is not the AI-generated reference image and is not proof that AirPrint will print without margins. Please compare this live design with the approved pictures before showing it to the customer.</p>
    <a href="/print-test" style={{display:'inline-block',background:'#fb8319',color:'#071b35',padding:'14px 18px',borderRadius:12,fontWeight:700,textDecoration:'none'}}>Open printer test</a>
   </aside>
  </div>
 </section></main>;
}

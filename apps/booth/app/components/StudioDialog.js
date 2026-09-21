'use client';
import {useEffect,useRef} from 'react';
export default function StudioDialog({title,children,onClose,busy=false,wide=false}){
 const ref=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const element=ref.current,previous=document.activeElement;if(!element.open)element.showModal();return()=>{element.close();previous?.focus?.();};},[]);
 return <dialog ref={ref} className={'ksDialog'+(wide?' ksDialogWide':'')} aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)close.current();}} onClick={e=>{if(e.target===ref.current&&!busy)close.current();}}><div className="ksDialogHead"><div><span className="ksEyebrow">Friendly Photo Booth</span><h2>{title}</h2></div><button type="button" className="ksIconButton" disabled={busy} aria-label="Close dialog" onClick={()=>close.current()}>×</button></div>{children}</dialog>;
}

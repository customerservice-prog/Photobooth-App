'use client';
import {useEffect,useState} from 'react';
import {workspace} from '../lib/event-workspace.mjs';
import {listPrintRequests} from '../lib/print-ledger.mjs';
export default function StaffPrintPanel({onReviewPrint}){
 const [rows,setRows]=useState([]);
 function refresh(){setRows(listPrintRequests(localStorage,workspace(location.search)));}
 useEffect(refresh,[]);
 function resolve(id,outcome){if(onReviewPrint?.(id,outcome)!==false)refresh();}
 const pending=rows.filter(r=>r.status==='requested');
 return <details className="operatorFold" data-testid="staff-print-ledger">
  <summary>Canon print requests <span>{pending.length} awaiting paper confirmation</span></summary>
  <div className="operatorFoldContent">
   <p>The browser cannot know if a Canon sheet physically printed. Check the paper before confirming. Only staff may restore a failed request to the allowance.</p>
   {rows.slice(0,12).map(r=><div className="operatorPrintLog" key={r.id}>
    <strong>{new Date(r.time).toLocaleTimeString()} · {r.status==='requested'?'Paper not verified':r.status==='printed'?'Staff confirmed printed':'Failed; one print restored'}</strong>
    {r.status==='requested'&&<div className="operatorHandoffButtons">
     <button type="button" className="operatorQuickPaste" onClick={()=>resolve(r.id,'printed')}>Paper came out</button>
     <button type="button" className="operatorQuickPaste" onClick={()=>resolve(r.id,'failed')}>Failed · restore 1 print</button>
    </div>}
   </div>)}
   {!rows.length&&<p>No recent print requests recorded on this iPad.</p>}
  </div>
 </details>;
}
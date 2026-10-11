'use client';
import StaffPageNav from '../components/StaffPageNav';
import BoothContextLink from '../components/BoothContextLink';
import {useEffect,useState} from 'react';
import DeliveryPanel from '../components/DeliveryPanel';
export default function DeliveryCheck(){
  const [photo,setPhoto]=useState(null),[error,setError]=useState('');
  useEffect(()=>{const image=new Image();image.onload=()=>{try{const c=document.createElement('canvas');c.width=1200;c.height=1400;c.getContext('2d').drawImage(image,0,0,1200,1400);setPhoto(c.toDataURL('image/jpeg',.9));}catch{setError('Test image could not be prepared. No message will be sent.');}};image.onerror=()=>setError('Test image could not load.');image.src='/print-test.svg';return()=>{image.onload=null;image.onerror=null;};},[]);
  return <main className="deliveryLab"><div className="labWrap"><StaffPageNav/>
   <h1>Email delivery test</h1>
   <p>Send one sample photo to yourself before guests arrive. This does not use a customer photo or print allowance.</p>
   <ol className="deliveryTestSteps"><li>Enable sending on this device.</li><li>Enter your own email and send the TEST image.</li><li>Open the email, its attachment, and its download link.</li></ol>
   {photo&&<div className="deliveryTestSample"><img className="deliveryTestPreview" src={photo} alt="The sample TEST image used for this delivery check"/><p>This is the sample photo you will receive.<br/>No message has been sent by opening this page.</p></div>}
   {error&&<p role="alert">{error}</p>}
   <DeliveryPanel diagnostic test photo={photo} title="Friendly Party Rental — Booth Test"/>
   <section className="opCard"><h2>Check your inbox</h2><p>After sending, open the email on your phone or computer. Check Spam or Junk too. Confirm that the photo attachment opens and the private download link shows the same TEST image.</p><p>“Accepted for sending” does not prove inbox delivery. Provider receipts, when enabled, confirm only that the receiving mail server accepted the email. Your inbox check completes the test.</p></section>
   <BoothContextLink className="action" href="/print-test">Test a Canon 4×6 print</BoothContextLink>
  </div></main>;
}

'use client';
import {useEffect,useState} from 'react';
export default function DesktopInstall(){
 const [prompt,setPrompt]=useState(null);
 const [installed,setInstalled]=useState(false);
 const [platform,setPlatform]=useState('');
 useEffect(()=>{
  const check=()=>setInstalled(window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true);
  check();setPlatform(navigator.userAgent||'');
  const onPrompt=e=>{e.preventDefault();setPrompt(e)};
  const onInstalled=()=>{setInstalled(true);setPrompt(null)};
  window.addEventListener('beforeinstallprompt',onPrompt);
  window.addEventListener('appinstalled',onInstalled);
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)};
 },[]);
 const install=async()=>{
  if(!prompt)return;
  await prompt.prompt();
  const result=await prompt.userChoice;
  if(result?.outcome==='accepted')setPrompt(null);
 };
 const mac=/Macintosh|Mac OS X/.test(platform);
 return <section className="card cardPad" data-testid="desktop-install">
  <div className="eyebrow">DESKTOP APP</div><h2 className="sectionTitle">Friendly Booth on your computer</h2>
  <p className="sectionLead">Install your owner workspace as an app with its own window and desktop or Start menu shortcut. Manage events, photos, galleries, print records and archived-event deletion using the same secured account.</p>
  {installed?<p className="helpNote" role="status">This window is already running as the installed Friendly Booth app.</p>:prompt?<button className="btn" type="button" onClick={install}>Install Friendly Booth on this computer</button>:<div className="helpNote">To install: open this page in Chrome or Edge, then use the browser menu → <strong>Install page as app</strong> (Edge: Apps → Install this site as an app). {mac?'On a Mac using Safari, choose File → Add to Dock.':''} If installation is not offered, ensure you are using the secure HTTPS address.</div>}
  <p className="sectionLead" style={{marginTop:14}}>To remove the desktop app, use your computer’s installed apps list or the app’s menu → Uninstall. Uninstalling removes the shortcut/app shell; it <strong>does not delete</strong> your online customer records or photos. To delete archived event records, go to Events → Completed and follow the verified-backup confirmation.</p>
 </section>;
}

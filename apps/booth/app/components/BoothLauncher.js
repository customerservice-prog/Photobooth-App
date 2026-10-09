import {BOOTH_RELEASE,BOOTH_RELEASE_LABEL,freshBoothEntry} from '../lib/booth-launch.mjs';
import AppUpdate from './AppUpdate';
import AppRouteResume from './AppRouteResume';
import './booth-launcher.css';

// Server-rendered native links still work if an older iPad cannot hydrate React.
// Each click starts a fresh document, rather than reusing a cached client route.
export default function BoothLauncher(){
  const stamp=Date.now();
  return <main className="blPage" data-launch-version={BOOTH_RELEASE}>
    <AppRouteResume/><div className="blWrap">
      <header className="blHeader"><span className="blBrand">FRIENDLY<small>THE PHOTO BOOTH EXPERIENCE</small></span><span className="blVersion">Version {BOOTH_RELEASE}</span></header>
      <section className="blCard" aria-labelledby="blTitle">
        <div className="blSmile" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="27"/><path d="M20 37c5 12 19 12 24 0M22 23v3m20-3v3"/></svg></div>
        <p className="blEyebrow">YOUR IPAD STARTS HERE</p>
        <h1 id="blTitle">Choose the look.<br/><em>Start the event.</em></h1>
        <p className="blIntro">Choose your customer’s event, pick a layout or Custom, and start. The booth uses that design and saves the event photos automatically.</p>
        <a className="blPrimary" data-testid="launch-start-event" href="/staff/start"><span>Choose layout &amp; start event<small>Staff PIN · event · layout or Custom</small></span><span aria-hidden="true">→</span></a>
        <div className="blFlow" aria-label="Start the event"><span>Choose event</span><span>Pick layout or Custom</span><span>Start</span></div>
        <p className="blDetail">Guests then choose <strong>1 Photo</strong> or <strong>4 Photos</strong>. Their finished image is ready to print or send.</p>
        <details className="blAdvanced" data-testid="launch-practice"><summary>Practice &amp; older setups</summary>
         <a className="blPrimary" data-testid="launch-demo" href={freshBoothEntry('demo',stamp)}><span>Open office demo<small>Practice only · separate from customer photos</small></span><span aria-hidden="true">→</span></a>
         <a className="blGraduation" data-testid="launch-graduation" href="/lamarr-preview"><span><strong>GRADUATION PREVIEW</strong><small>Try the one-photo and four-photo designs</small></span><span aria-hidden="true">→</span></a>
         <div className="blOther"><a data-testid="launch-preparation" href={freshBoothEntry('preparation',stamp)}>Older local event studio →</a><a data-testid="launch-saved" href={freshBoothEntry('saved',stamp)}>Resume saved booth →</a></div>
        </details>
      </section>
      <aside className="blSupport"><h2>Ready for guests?</h2><p>Use the Friendly Booth app on the event iPad. Check the camera, sound, and a real printer sheet before guests arrive.</p><AppUpdate/><a data-testid="launch-refresh" href={freshBoothEntry('launch',stamp)}>Reload this start screen</a><span className="blRelease">{BOOTH_RELEASE_LABEL}</span></aside>
      <footer className="blFooter">Friendly Party Rental <span>Real camera and printer checks still happen on your equipment.</span></footer>
    </div>
  </main>;
}

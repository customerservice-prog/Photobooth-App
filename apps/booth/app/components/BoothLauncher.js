import {BOOTH_RELEASE,BOOTH_RELEASE_LABEL,freshBoothEntry} from '../lib/booth-launch.mjs';
import {withReturnTo} from '../lib/staff-navigation.mjs';
import AppUpdate from './AppUpdate';
import CurrentEventResume from './CurrentEventResume';
import './booth-launcher.css';

// Server-rendered native links still work if an older iPad cannot hydrate React.
// Each click starts a fresh document, rather than reusing a cached client route.
export default function BoothLauncher(){
  const stamp=Date.now();
  return <main className="blPage" data-launch-version={BOOTH_RELEASE}>
    <div className="blWrap">
      <header className="blHeader"><span className="blBrand">FRIENDLY<small>THE PHOTO BOOTH EXPERIENCE</small></span><span className="blVersion">Version {BOOTH_RELEASE}</span></header>
      <section className="blCard" aria-labelledby="blTitle">
        <div className="blSmile" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="27"/><path d="M20 37c5 12 19 12 24 0M22 23v3m20-3v3"/></svg></div>
        <p className="blEyebrow">STAFF START SCREEN</p>
        <h1 id="blTitle">Get the booth<br/><em>ready for guests.</em></h1>
        <p className="blIntro">Choose an event and its layout on one screen, then open the guest welcome. Return here whenever you need to set up another event.</p>
        <CurrentEventResume/>
        <a className="blPrimary" data-testid="launch-start-event" href="/staff/start"><span>Choose event &amp; layout<small>Staff PIN · review the current event or prepare another</small></span><span aria-hidden="true">→</span></a>
        <ol className="blFlow" role="list" aria-label="Prepare the booth"><li>Choose event</li><li>Choose layout</li><li>Open guest welcome</li></ol>
        <p className="blDetail">On the guest welcome, guests choose <strong>1 Photo</strong> or <strong>4 Photos</strong>, then tap <strong>Start</strong>. Photos save to the selected event.</p>
        <details className="blAdvanced" data-testid="launch-practice"><summary>Practice &amp; older setups</summary>
         <a className="blPrimary" data-testid="launch-demo" href={withReturnTo(freshBoothEntry('demo',stamp),'/launch')}><span>Open office demo<small>Practice only · separate from customer photos</small></span><span aria-hidden="true">→</span></a>
         <a className="blGraduation" data-testid="launch-graduation" href={withReturnTo('/lamarr-preview','/launch')}><span><strong>GRADUATION PREVIEW</strong><small>Try the one-photo and four-photo designs</small></span><span aria-hidden="true">→</span></a>
         <div className="blOther"><a data-testid="launch-preparation" href={withReturnTo(freshBoothEntry('preparation',stamp),'/launch')}>Older local event studio →</a><a data-testid="launch-saved" href={withReturnTo(freshBoothEntry('saved',stamp),'/launch')}>Open saved booth welcome →</a></div>
        </details>
      </section>
      <aside className="blSupport"><h2>Ready for guests?</h2><p>Use the Friendly Booth app on the event iPad. Check the camera, sound, and a real printer sheet before guests arrive.</p><AppUpdate/><a data-testid="launch-refresh" href={freshBoothEntry('launch',stamp)}>Reload this start screen</a><span className="blRelease">{BOOTH_RELEASE_LABEL}</span></aside>
      <footer className="blFooter">Friendly Party Rental <span>Real camera and printer checks still happen on your equipment.</span></footer>
    </div>
  </main>;
}

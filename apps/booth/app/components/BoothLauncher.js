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
        <h1 id="blTitle">A fresh start.<br/><em>Nothing lost.</em></h1>
        <p className="blIntro">Open the customer’s office demo with the Smile countdown and separate poses. This page does not reset saved event details, photos, or print counts.</p>
        <a className="blPrimary" data-testid="launch-demo" href={freshBoothEntry('demo',stamp)}><span>Open October 10 office demo<small>Photos only · no physical prints in demo mode</small></span><span aria-hidden="true">→</span></a>
        <a className="blGraduation" data-testid="launch-graduation" href="/lamarr-preview"><span><strong>SEE THE NAVY &amp; GOLD GRADUATION DESIGN</strong><small>Preview the one-photo card and four-photo keepsake · enter the graduate’s name · take photos</small></span><span aria-hidden="true">→</span></a>
        <div className="blFlow" aria-label="What happens after Take a Photo"><span>3–2–1 &amp; Smile!</span><span>Each pose captured</span><span>Then print choices</span></div>
        <p className="blDetail">Tap <strong>Take a Photo</strong> on the next screen. The countdown appears after camera access is allowed. A four-pose session takes four separate photos automatically before showing the design page.</p>
        <div className="blOther"><a data-testid="launch-preparation" href={freshBoothEntry('preparation',stamp)}>Edit the customer’s event →</a><a data-testid="launch-saved" href={freshBoothEntry('saved',stamp)}>Open the general saved booth →</a></div>
      </section>
      <aside className="blSupport"><h2>Still seeing an older screen?</h2><p>Use this page in Safari on the iPad, then open the office demo above. You do not need to delete the Home Screen icon or clear Safari’s website data. Keep existing photos and settings in their original browser.</p><p>Safari and the saved Home Screen app may have different local settings. This opens the latest app code; it does not transfer photos between them.</p><AppUpdate/><a data-testid="launch-refresh" href={freshBoothEntry('launch',stamp)}>Reload this start screen</a><span className="blRelease">{BOOTH_RELEASE_LABEL}</span></aside>
      <footer className="blFooter">Friendly Party Rental <span>Real camera and printer checks still happen on your equipment.</span></footer>
    </div>
  </main>;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../app/'+p,import.meta.url),'utf8');

test('welcome offers one-photo and four-photo still-image experiences with actual layout previews',()=>{
  const source=read('components/WelcomeScreen.js');
  assert.equal((source.match(/data-testid="welcome-(quick|four)-photo"/g)||[]).length,2);
  assert(source.includes('data-testid="welcome-staff-tools"'));
  assert(source.includes('data-testid="welcome-quick-photo"'));
  assert(source.includes('data-testid="welcome-four-photo"'));
  assert(source.includes("onClick={()=>setChoice('one')}"),'1-photo choice previews before starting');
  assert(source.includes("onClick={()=>setChoice('four')}"),'4-photo choice previews before starting');
  assert(source.includes('data-testid="welcome-large-proof"'));
  assert(source.includes('data-testid="welcome-start-session"'));
  assert(source.includes('onClick={startSelected}'));
  assert(source.includes('function startSelected()'));
  assert(source.includes('onStartQuick()')&&source.includes('onStartFour()'));
  assert(source.includes('SAMPLE PHOTOS')&&source.includes('YOUR PHOTOS REPLACE THESE'));
  assert(source.includes('className="bwLayoutPreview"'));
  assert(source.includes('className="bwPreviewCaption"'));
  assert(!source.includes('className="bwPhotoSteps"'));
  assert(!/Short Video|Animated GIF|welcome-video|welcome-gif|onSelectMode/.test(source));
});

test('guest runtime has no recording encoder, motion state or motion preview route',()=>{
  const source=read('page.js');
  assert(!/MediaRecorder|GIFEncoder|gifenc|takeBoomerang|takeGif|motionPreview|gifPreview|shareMotion|setMode|chooseMode/.test(source));
  assert(source.includes('onStartQuick={()=>begin(1)}'));
  assert(source.includes('onStartFour={()=>begin(4)}'));
  assert(source.includes('const shots=await runPhotoSequence('));
  assert(source.includes('takeFreshPhoto(video.current,options)'));
  assert(!source.includes('onRetake={retake}'),'Finished guests return with Done and choose the next session from welcome');
  assert(source.includes('audio:false'));
  assert(read('lib/photo-sequence.mjs').includes("canvas.toDataURL('image/jpeg',.92)"));
});

test('photo-only presentation keeps configured poses and the existing allowance plumbing',()=>{
  const source=read('page.js'),welcome=read('components/WelcomeScreen.js');
  assert(source.includes('sessionShots={sessionShots}'));
  assert(source.includes('printPackage={normalizePrintPackage(cfg.printPackage)} printsUsed={printsUsed}'));
  assert(source.includes('onPrint={requestPrint}'));
  assert(source.includes('onSessionActive={setPreviewActive}'));
  assert(welcome.includes('printsRemaining(rules,printsUsed)'));
  assert(!/localStorage\.(setItem|clear|removeItem)/.test(welcome),'Welcome must not change stored events or usage');
});

test('late still-photo composition cannot revive an abandoned guest session',()=>{
  const source=read('page.js');
  assert.match(source,/const data=total===1\?shots\[0\]:await composePhotoStrip\(shots,[^\n]+\);if\(id!==run\.current\)return;/);
});


test('large keepsake proof uses the production PrintCard renderer and sample photos never become a captured session',()=>{
  const source=read('components/WelcomeScreen.js');
  const printer=read('components/PrintCard.js');
  assert.match(source,/data-testid="welcome-large-proof"/);
  assert.match(source,/data-selected-photos=\{String\(chosenShots\)\}/);
  assert.match(source,/onClick=\{startSelected\}/);
  assert.match(source,/useSamplePoses\(family\)/);
  assert.match(source,/\/images\/welcome-poses\//);
  assert.match(source,/<PrintCard photo=\{samples\?poses\[0\]:''\}/);
  assert.match(printer,/renderKeepsake\(/);
  assert.doesNotMatch(source,/localStorage\.(setItem|clear|removeItem)/);
  assert.doesNotMatch(source,/getUserMedia|saveCapture|print\(\)/);
  assert.match(source,/SAMPLE PHOTOS/);
});

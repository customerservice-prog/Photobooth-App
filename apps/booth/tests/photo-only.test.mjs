import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../app/'+p,import.meta.url),'utf8');

test('welcome has exactly one photo capture action and an instructional guide',()=>{
  const source=read('components/WelcomeScreen.js');
  assert.equal((source.match(/data-testid="welcome-/g)||[]).length,1);
  assert(source.includes('data-testid="welcome-photo"'));
  assert(source.includes('onClick={onStartPhotos}'));
  assert(source.includes('className="bwPhotoSteps"'));
  assert(!/Short Video|Animated GIF|welcome-video|welcome-gif|onSelectMode/.test(source));
});

test('guest runtime has no recording encoder, motion state or motion preview route',()=>{
  const source=read('page.js');
  assert(!/MediaRecorder|GIFEncoder|gifenc|takeBoomerang|takeGif|motionPreview|gifPreview|shareMotion|setMode|chooseMode/.test(source));
  assert(source.includes('onStartPhotos={begin}'));
  assert(source.includes('const shots=await runPhotoSequence('));
  assert(source.includes('takeFreshPhoto(video.current,options)'));
  assert(source.includes("function retake(){setPhoto(null);begin()}"));
  assert(source.includes('audio:false'));
  assert(read('lib/photo-sequence.mjs').includes("canvas.toDataURL('image/jpeg',.92)"));
});

test('photo-only presentation keeps configured poses and the existing allowance plumbing',()=>{
  const source=read('page.js'),welcome=read('components/WelcomeScreen.js');
  assert(source.includes('normalizePrintPackage(cfg.printPackage).shotsPerSession'));
  assert(source.includes('printPackage={normalizePrintPackage(cfg.printPackage)} printsUsed={printsUsed}'));
  assert(source.includes('onPrint={requestPrint}'));
  assert(source.includes('onSessionActive={setPreviewActive}'));
  assert(welcome.includes('printsRemaining(rules,printsUsed)'));
  assert(!/localStorage\.(setItem|clear|removeItem)/.test(welcome),'Welcome must not change stored events or usage');
});

test('late still-photo composition cannot revive an abandoned guest session',()=>{
  const source=read('page.js');
  assert(source.includes('const data=await composePhotoStrip(shots,cfg);if(id!==run.current)return;'));
});

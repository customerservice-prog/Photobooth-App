// Build prerecorded iPad voice prompts locally. No guest-side text-to-speech, paid API or microphone.
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const required=process.env.REQUIRE_BOOTH_VOICE_CLIPS==='1';
function run(command,args){
 const result=spawnSync(command,args,{encoding:'utf8',timeout:45000});
 if(result.error||result.status!==0)throw new Error(command+' failed preparing booth voice: '+(result.stderr||result.error?.message||result.status));
}
function present(command,flag){
 const p=spawnSync(command,[flag],{encoding:'utf8',timeout:5000});
 return !p.error&&p.status===0;
}
if(!present('espeak','--version')||!present('ffmpeg','-version')){
 if(required)throw new Error('Recorded booth voice is required: add espeak ffmpeg to RAILPACK_BUILD_APT_PACKAGES.');
 console.warn('Optional recorded voice preparation skipped: espeak/ffmpeg missing in test environment.');
}else{
 const dir=await mkdtemp(join(tmpdir(),'friendly-booth-voice-')),out='public/voice';
 try{
  await mkdir(out,{recursive:true});
  function say(name,words){
   const path=join(dir,name+'.wav');
   run('espeak',['-v','en-us+f3','-s','185','-p','55','-a','190','-w',path,words]);
   return path;
  }
  function convert(wav,name){
   run('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',wav,'-af','highpass=f=140,lowpass=f=5500,acompressor=threshold=0.125:ratio=2.5:attack=5:release=50','-ac','1','-ar','16000','-b:a','40k',join(out,name+'.mp3')]);
  }
  convert(say('start','Hello! Sound is on. Get ready to smile!'),'start');
  convert(say('next','Nice one! Change your pose! Another photo is coming up!'),'next');
  const inputs=['Three!','Two!','One!','Smile!'].map((word,i)=>say('count-'+i,word));
  const chain=inputs.map((_,i)=>'['+i+':a]aresample=16000,adelay='+i*1000+':all=1[c'+i+']').join(';')+';[c0][c1][c2][c3]amix=inputs=4:duration=longest:normalize=0,alimiter=limit=0.95[out]';
  run('ffmpeg',['-y','-hide_banner','-loglevel','error',...inputs.flatMap(s=>['-i',s]),'-filter_complex',chain,'-map','[out]','-t','3.85','-ac','1','-ar','16000','-b:a','40k',join(out,'countdown.mp3')]);
  for(const name of ['start','next','countdown']){
   const size=(await stat(join(out,name+'.mp3'))).size;
   if(size<1500)throw new Error('Generated voice clip is invalid: '+name);
   console.log('Prepared recorded booth voice: '+name+'.mp3 ('+size+' bytes)');
  }
 }finally{await rm(dir,{recursive:true,force:true});}
}

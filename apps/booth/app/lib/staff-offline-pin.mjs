// Remember a slow, salted verifier only after a successful online staff PIN check.
// No PIN or password is ever saved to device storage.
const KEY='friendly-booth-offline-staff-v1',encoder=new TextEncoder(),rounds=200000;
async function derive(pin,salt){
 const key=await crypto.subtle.importKey('raw',encoder.encode(pin),'PBKDF2',false,['deriveBits']);
 return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:rounds,hash:'SHA-256'},key,256));
}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=s=>new Uint8Array(s.match(/.{2}/g).map(s=>parseInt(s,16)));
export async function rememberOfflineStaffPin(storage,pin){
 if(!/^\d{8}$/.test(pin))return false;
 try{
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const result=await derive(pin,salt);
  storage.setItem(KEY,JSON.stringify({version:1,salt:hex(salt),digest:hex(result)}));
  return true;
 }catch{return false;}
}
export async function verifyOfflineStaffPin(storage,pin){
 if(!/^\d{8}$/.test(pin))return false;
 try{
  const v=JSON.parse(storage.getItem(KEY)||'null');
  if(!v||v.version!==1||!/^[a-f0-9]{32}$/.test(v.salt)||!/^[a-f0-9]{64}$/.test(v.digest))return false;
  const result=hex(await derive(pin,unhex(v.salt)));
  let mismatch=0;for(let i=0;i<64;i++)mismatch|=result.charCodeAt(i)^v.digest.charCodeAt(i);
  return mismatch===0;
 }catch{return false;}
}

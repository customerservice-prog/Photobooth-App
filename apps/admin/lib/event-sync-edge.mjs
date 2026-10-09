const encoder=new TextEncoder();
export async function validSyncRequest(token,eventId,secret){
 if(typeof token!=='string'||token.length>512||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)||typeof secret!=='string'||secret.length<32||!/^[A-Za-z0-9_-]{3,90}$/.test(eventId))return false;
 const parts=token.split('.');
 if(parts.length!==2)return false;
 try{
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(parts[0])));
  const expected=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if(expected.length!==parts[1].length)return false;
  let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^parts[1].charCodeAt(i);
  if(diff)return false;
  const data=JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/')));
  return data.id===eventId&&data.expires>Date.now()&&data.expires<=Date.now()+365*86400000+60000;
 }catch{return false;}
}

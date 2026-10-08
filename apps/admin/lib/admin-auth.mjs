// Authenticated owner sessions for the admin application.
export const ADMIN_COOKIE='__Host-friendly-photo-admin';
const encoder=new TextEncoder();
async function digest(secret,body){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function createAdminSession(secret,now=Date.now()){
 if(typeof secret!=='string'||secret.length<32)throw new Error('Admin auth not configured');
 const payload='v1.'+(Math.floor(now/1000)+28800)+'.'+crypto.randomUUID().replaceAll('-','');
 return payload+'.'+await digest(secret,payload);
}
export async function validAdminSession(raw,secret,now=Date.now()){
 if(typeof secret!=='string'||secret.length<32||typeof raw!=='string')return false;
 const segments=raw.split('.');
 if(segments.length!==4||segments[0]!=='v1'||!/^\d{10}$/.test(segments[1])||!/^[0-9a-f]{32}$/.test(segments[2])||!/^[0-9a-f]{64}$/.test(segments[3]))return false;
 const exp=Number(segments[1]),cur=Math.floor(now/1000);
 if(exp<=cur||exp>cur+28860)return false;
 const expected=await digest(secret,segments.slice(0,3).join('.'));
 let diff=0;
 for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^segments[3].charCodeAt(i);
 return diff===0;
}

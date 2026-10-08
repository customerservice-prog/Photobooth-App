// The PIN is validated by the server; only a short-lived signed session cookie is issued.
export const STAFF_COOKIE='__Host-friendly-booth-staff';
const encoder=new TextEncoder();
async function sign(secret,message){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(message))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function makeStaffSession(secret,now=Date.now()){
 if(typeof secret!=='string'||secret.length<32)throw new Error('Staff sessions are not configured');
 const text='staff.'+(Math.floor(now/1000)+15*60)+'.'+crypto.randomUUID().replaceAll('-','');
 return text+'.'+await sign(secret,text);
}
export async function validStaffSession(value,secret,now=Date.now()){
 if(typeof secret!=='string'||secret.length<32||typeof value!=='string')return false;
 const s=value.split('.');
 if(s.length!==4||s[0]!=='staff'||!/^\d{10}$/.test(s[1])||!/^[a-f0-9]{32}$/.test(s[2])||!/^[a-f0-9]{64}$/.test(s[3]))return false;
 const expire=Number(s[1]),current=Math.floor(now/1000);
 if(expire<=current||expire>current+15*60+60)return false;
 const expected=await sign(secret,s.slice(0,3).join('.'));
 let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^s[3].charCodeAt(i);
 return diff===0;
}
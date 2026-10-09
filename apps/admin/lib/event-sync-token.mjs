import {createHmac,timingSafeEqual} from 'node:crypto';
const secret=()=>process.env.PHOTOBOOTH_EVENT_SYNC_SECRET||'';
export function makeSyncTicket(id,when){
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)||secret().length<32)throw new Error('Sync unavailable');
 const expires=Math.min(new Date(when).getTime()+7*86400000,Date.now()+365*86400000);
 const payload=Buffer.from(JSON.stringify({id,expires})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret()).update(payload).digest('base64url');
}
export function checkSyncTicket(token,id){
 if(secret().length<32||typeof token!=='string'||token.length>512||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)||!/^[A-Za-z0-9_-]{3,90}$/.test(String(id||'')))return false;
 const part=token.split('.');if(part.length!==2)return false;
 const a=Buffer.from(part[1],'base64url'),b=createHmac('sha256',secret()).update(part[0]).digest();
 if(a.length!==b.length||!timingSafeEqual(a,b))return false;
 try{const p=JSON.parse(Buffer.from(part[0],'base64url').toString());return p.id===id&&p.expires>Date.now()&&p.expires<=Date.now()+365*86400000+60000;}catch{return false;}
}

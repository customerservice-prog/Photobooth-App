import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const validId=id=>/^[A-Za-z0-9_-]{3,90}$/.test(String(id||''));
function secret(){
 const value=process.env.BOOTH_BACKUP_SECRET||'';
 if(value.length<32)throw new Error('Backup security is not configured.');
 return value;
}
export function authorizeBackup(eventId){
 if(!validId(eventId))throw new Error('Invalid event ID');
 const payload=Buffer.from(JSON.stringify({v:1,eventId,expires:Date.now()+30*86400000,nonce:randomBytes(12).toString('hex')})).toString('base64url');
 const signature=createHmac('sha256',secret()).update(payload).digest('base64url');
 return payload+'.'+signature;
}
export function verifyBackupTicket(token,eventId){
 if(!validId(eventId)||typeof token!=='string'||token.length>500)return false;
 const parts=token.split('.');if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(parts[0]))return false;
 const actual=Buffer.from(parts[1]||'','base64url');
 const expected=createHmac('sha256',secret()).update(parts[0]).digest();
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
 try{
  const data=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  return data.v===1&&data.eventId===eventId&&Number.isSafeInteger(data.expires)&&data.expires>Date.now()&&data.expires<=Date.now()+30*86400000+60000;
 }catch{return false;}
}

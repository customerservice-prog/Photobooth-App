import {createHash,timingSafeEqual} from 'node:crypto';
import {ADMIN_COOKIE,createAdminSession} from './admin-auth.mjs';
import {adminPublicOrigin,isSameAdminOrigin} from './admin-origin.mjs';

const attempts=new Map();
const messages={
 password:'That password did not match. Please try again.',
 '1':'That password did not match. Please try again.',
 origin:'This sign-in request could not be verified. Please use the form below to try again.',
 setup:'Staff sign-in is not ready yet. The owner needs to finish the account setup.',
 limited:'Too many sign-in attempts. Please wait 15 minutes before trying again.',
 request:'This sign-in request could not be read. Please enter your password again.'
};
export const adminLoginErrorMessage=error=>Object.hasOwn(messages,String(error||''))?messages[String(error||'')]:'';
export function adminLoginConfigured(env=process.env){
 return /^[0-9a-f]{64}$/i.test(env.PHOTOBOOTH_ADMIN_PASSWORD_SHA256||'')&&
  typeof env.PHOTOBOOTH_AUTH_SECRET==='string'&&env.PHOTOBOOTH_AUTH_SECRET.length>=32;
}
function redirect(origin,path){
 return new Response(null,{status:303,headers:{Location:new URL(path,origin).href,'Cache-Control':'no-store'}});
}
export async function handleAdminLogin(request,{env=process.env,attemptStore=attempts,now=Date.now()}={}){
 const origin=adminPublicOrigin(request,env);
 if(!origin)return new Response('Staff sign-in is not ready yet. The owner needs to finish the account setup.',{status:503,headers:{'Cache-Control':'no-store'}});
 const reject=error=>redirect(origin,'/login?error='+error);
 if(!isSameAdminOrigin(request,env))return reject('origin');
 if(!adminLoginConfigured(env))return reject('setup');
 if(Number(request.headers.get('content-length'))>4096)return reject('request');
 const ip=(request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,64);
 const state=attemptStore.get(ip)||{count:0,end:now+900000};
 if(now>state.end){state.count=0;state.end=now+900000;}
 if(state.count>=10)return reject('limited');
 let input;
 try{input=await request.formData();}catch{return reject('request');}
 const password=String(input.get('password')||'');
 const valid=password.length>=12&&password.length<=180&&timingSafeEqual(
  createHash('sha256').update(password).digest(),Buffer.from(env.PHOTOBOOTH_ADMIN_PASSWORD_SHA256,'hex'));
 if(!valid){state.count++;attemptStore.set(ip,state);return reject('password');}
 const session=await createAdminSession(env.PHOTOBOOTH_AUTH_SECRET,now);
 attemptStore.delete(ip);
 const response=redirect(origin,'/dashboard');
 response.headers.set('Set-Cookie',`${ADMIN_COOKIE}=${session}; Path=/; Max-Age=28800; HttpOnly; SameSite=Strict${env.NODE_ENV==='production'?'; Secure':''}`);
 return response;
}

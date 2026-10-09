import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleAdminLogin,adminLoginConfigured,adminLoginErrorMessage} from '../lib/admin-login.mjs';
import {adminPublicOrigin,isSameAdminOrigin} from '../lib/admin-origin.mjs';
import {ADMIN_COOKIE,validAdminSession} from '../lib/admin-auth.mjs';

const publicOrigin='https://photobooth-app-production.up.railway.app';
const password='test-owner-password-not-for-production';
const now=Date.parse('2026-10-08T23:00:00.000Z');
const env={NODE_ENV:'production',PHOTOBOOTH_ADMIN_ORIGIN:publicOrigin,PHOTOBOOTH_ADMIN_PASSWORD_SHA256:createHash('sha256').update(password).digest('hex'),PHOTOBOOTH_AUTH_SECRET:'test-admin-auth-secret-more-than-thirty-two-characters'};
function request({origin=publicOrigin,value=password,url='http://0.0.0.0:8080/api/auth/login',headers={}}={}){
 return new Request(url,{method:'POST',headers:{...(origin===null?{}:{origin}),...headers},body:new URLSearchParams({password:value})});
}
function checkRejected(response,error){
 assert.equal(response.status,303);
 assert.equal(response.headers.get('location'),`${publicOrigin}/login?error=${error}`);
 assert.equal(response.headers.get('set-cookie'),null);
 assert.equal(response.headers.get('cache-control'),'no-store');
}

test('Railway internal URL signs in from the configured public origin and issues a valid secure session',async()=>{
 const response=await handleAdminLogin(request({headers:{'x-forwarded-host':'photobooth-app-production.up.railway.app','x-forwarded-proto':'https'}}),{env,now,attemptStore:new Map()});
 assert.equal(response.status,303);
 assert.equal(response.headers.get('location'),`${publicOrigin}/dashboard`);
 const cookie=response.headers.get('set-cookie');
 assert(cookie.startsWith(ADMIN_COOKIE+'='));
 for(const attribute of ['Path=/','Max-Age=28800','HttpOnly','SameSite=Strict','Secure'])assert(cookie.includes(attribute));
 assert.equal(await validAdminSession(cookie.split(';')[0].slice(ADMIN_COOKIE.length+1),env.PHOTOBOOTH_AUTH_SECRET,now),true);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('Railway public domain supplies the canonical origin without trusting forwarded headers',async()=>{
 const platformEnv={...env,PHOTOBOOTH_ADMIN_ORIGIN:undefined,RAILWAY_PUBLIC_DOMAIN:new URL(publicOrigin).hostname};
 assert.equal(adminPublicOrigin(request(),platformEnv),publicOrigin);
 const response=await handleAdminLogin(request(),{env:platformEnv,now,attemptStore:new Map()});
 assert.equal(response.headers.get('location'),`${publicOrigin}/dashboard`);
});
test('cross-site, opaque and missing origins fail even with a correct password or spoofed proxy headers',async()=>{
 for(const origin of ['https://other.example','null',null,'https://photobooth-app-production.up.railway.app.attacker.example']){
  const req=request({origin,headers:{'x-forwarded-host':origin||new URL(publicOrigin).hostname,'x-forwarded-proto':'https'}});
  assert.equal(isSameAdminOrigin(req,env),false);
  checkRejected(await handleAdminLogin(req,{env,now,attemptStore:new Map()}),'origin');
 }
});
test('forwarded internal or attacker origins never expand the configured origin allowlist',async()=>{
 checkRejected(await handleAdminLogin(request({origin:'http://0.0.0.0:8080',headers:{'x-forwarded-host':'0.0.0.0:8080','x-forwarded-proto':'http'}}),{env,now,attemptStore:new Map()}),'origin');
 const response=await handleAdminLogin(request({headers:{'x-forwarded-host':'attacker.example','x-forwarded-proto':'http'}}),{env,now,attemptStore:new Map()});
 assert.equal(response.headers.get('location'),`${publicOrigin}/dashboard`);
});
test('invalid configured origin and unconfigured Railway runtime fail closed',async()=>{
 for(const badEnv of [
  {...env,PHOTOBOOTH_ADMIN_ORIGIN:'https://attacker.example/path'},
  {...env,PHOTOBOOTH_ADMIN_ORIGIN:'https://user:password@attacker.example'},
  {...env,PHOTOBOOTH_ADMIN_ORIGIN:undefined,RAILWAY_PROJECT_ID:'platform-project'},
  {...env,PHOTOBOOTH_ADMIN_ORIGIN:undefined,RAILWAY_PUBLIC_DOMAIN:'attacker.example/path'}
 ]){
  assert.equal(adminPublicOrigin(request(),badEnv),null);
  const response=await handleAdminLogin(request(),{env:badEnv,now,attemptStore:new Map()});
  assert.equal(response.status,503);
  assert.equal(response.headers.get('set-cookie'),null);
 }
});
test('direct local proof retains same-origin login without public deployment configuration',async()=>{
 const localEnv={...env,NODE_ENV:'development',PHOTOBOOTH_ADMIN_ORIGIN:undefined};
 const req=request({origin:'http://127.0.0.1:3001',url:'http://127.0.0.1:3001/api/auth/login'});
 assert.equal(isSameAdminOrigin(req,localEnv),true);
 const response=await handleAdminLogin(req,{env:localEnv,now,attemptStore:new Map()});
 assert.equal(response.headers.get('location'),'http://127.0.0.1:3001/dashboard');
});
test('missing or malformed credential settings show setup errors without creating sessions or throwing',async()=>{
 for(const badEnv of [
  {...env,PHOTOBOOTH_ADMIN_PASSWORD_SHA256:undefined},
  {...env,PHOTOBOOTH_ADMIN_PASSWORD_SHA256:'not-a-password-hash'},
  {...env,PHOTOBOOTH_AUTH_SECRET:undefined},
  {...env,PHOTOBOOTH_AUTH_SECRET:'short-secret'}
 ]){
  assert.equal(adminLoginConfigured(badEnv),false);
  checkRejected(await handleAdminLogin(request(),{env:badEnv,now,attemptStore:new Map()}),'setup');
 }
 assert.equal(adminLoginConfigured(env),true);
});
test('wrong passwords show an actionable error and ten failures retain the sign-in rate limit',async()=>{
 const attemptStore=new Map();
 for(let i=0;i<10;i++)checkRejected(await handleAdminLogin(request({value:'a-wrong-password'}),{env,now,attemptStore}),'password');
 checkRejected(await handleAdminLogin(request(),{env,now,attemptStore}),'limited');
 const response=await handleAdminLogin(request(),{env,now:now+900001,attemptStore});
 assert.equal(response.headers.get('location'),`${publicOrigin}/dashboard`);
 assert.equal(attemptStore.size,0);
 assert.match(adminLoginErrorMessage('password'),/try again/i);
 assert.match(adminLoginErrorMessage('limited'),/15 minutes/i);
 for(const error of ['unknown','constructor','__proto__'])assert.equal(adminLoginErrorMessage(error),'');
});
test('oversized or unreadable sign-in submissions remain unauthenticated',async()=>{
 checkRejected(await handleAdminLogin(request({headers:{'content-length':'4097'}}),{env,now,attemptStore:new Map()}),'request');
 const unreadable=new Request('http://0.0.0.0:8080/api/auth/login',{method:'POST',headers:{origin:publicOrigin,'content-type':'application/json'},body:'{}'});
 checkRejected(await handleAdminLogin(unreadable,{env,now,attemptStore:new Map()}),'request');
});

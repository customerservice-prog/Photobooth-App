// Trust configured public addresses, never client-supplied forwarded hosts.
const hosted=env=>Boolean(env.BOOTH_PUBLIC_URL||env.RAILWAY_PUBLIC_DOMAIN||env.RAILWAY_SERVICE_ID||env.RAILWAY_ENVIRONMENT_ID||env.RAILWAY_PROJECT_ID);
function configuredOrigin(value){
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash?url.origin:'';
 }catch{return '';}
}
export function publicBoothOrigin(env=process.env,requestUrl=''){
 if(env.BOOTH_PUBLIC_URL)return configuredOrigin(env.BOOTH_PUBLIC_URL);
 if(env.RAILWAY_PUBLIC_DOMAIN){
  const domain=String(env.RAILWAY_PUBLIC_DOMAIN);
  const origin=configuredOrigin('https://'+domain);
  return origin&&new URL(origin).host===domain.toLowerCase()?origin:'';
 }
 // A directly served local build may run Next's production server in CI.
 // A deployed Railway runtime must configure its real public address.
 if(hosted(env))return '';
 try{const url=new URL(requestUrl);return ['http:','https:'].includes(url.protocol)?url.origin:'';}catch{return '';}
}
export function hasTrustedStaffOrigin(request,env=process.env){
 const expected=publicBoothOrigin(env,request.url);
 return Boolean(expected)&&request.headers.get('origin')===expected;
}
export function staffSecurityStatus(env=process.env,requestUrl=''){
 const required=env.BOOTH_SECURITY_ENFORCED==='true'||env.NODE_ENV==='production'&&hosted(env);
 const missing=[];
 if(required){
  if(env.BOOTH_SECURITY_ENFORCED!=='true')missing.push('BOOTH_SECURITY_ENFORCED');
  if(!/^[a-f0-9]{64}$/i.test(env.BOOTH_STAFF_PIN_SHA256||''))missing.push('BOOTH_STAFF_PIN_SHA256');
  if(typeof env.BOOTH_STAFF_SESSION_SECRET!=='string'||env.BOOTH_STAFF_SESSION_SECRET.length<32)missing.push('BOOTH_STAFF_SESSION_SECRET');
  if(!publicBoothOrigin(env,requestUrl))missing.push('BOOTH_PUBLIC_URL');
 }
 return {required,configured:missing.length===0,missing};
}
export function staffConfigurationError(status){
 return status.missing.length?'Staff sign-in setup is incomplete ('+status.missing.join(', ')+'). Ask the owner to configure this booth.':'Staff PIN sign-in is not enabled on this booth.';
}

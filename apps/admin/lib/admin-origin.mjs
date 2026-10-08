// Public origins are configured by the owner/platform, never supplied by a forwarded header.
function exactOrigin(value){
 try{
  const url=new URL(value);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)return null;
  return url.origin;
 }catch{return null;}
}
export function adminPublicOrigin(request,env=process.env){
 const configured=String(env.PHOTOBOOTH_ADMIN_ORIGIN||'').trim();
 if(configured)return exactOrigin(configured);
 const domain=String(env.RAILWAY_PUBLIC_DOMAIN||'').trim();
 if(domain)return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain)?exactOrigin('https://'+domain):null;
 if(env.RAILWAY_PROJECT_ID||env.RAILWAY_SERVICE_ID||env.RAILWAY_ENVIRONMENT_ID)return null;
 try{return exactOrigin(new URL(request.url).origin);}catch{return null;}
}
export function isSameAdminOrigin(request,env=process.env){
 const expected=adminPublicOrigin(request,env),origin=request.headers.get('origin');
 return Boolean(expected&&origin&&exactOrigin(origin)===expected&&origin===expected);
}

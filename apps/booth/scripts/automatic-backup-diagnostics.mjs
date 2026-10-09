// WebKit can report a diagnostic Blob failure on another page in the same
// context, after the probe has completed, and omit "blob:" or the initial "h".
// Only the exact URLs registered by that probe qualify; product errors fail.
export function isRegisteredProbeBlobError(engine,message,registeredURLs){
 if(engine!=='webkit'||typeof message!=='string')return false;
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 for(const url of registeredURLs){
  if(!url.startsWith('blob:http://'))continue;
  const tail=escape(url.slice('blob:h'.length));
  if(new RegExp('(?:^|[^A-Za-z0-9:/])(?:blob:)?h?'+tail+'["\']? due to access control checks\\.$').test(message))return true;
 }
 return false;
}

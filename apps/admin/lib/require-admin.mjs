import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validAdminSession} from './admin-auth.mjs';
export async function requireAdmin(){
 if(!await validAdminSession(cookies().get(ADMIN_COOKIE)?.value,process.env.PHOTOBOOTH_AUTH_SECRET))
  throw new Error('Your staff session expired. Sign in again.');
 return true;
}
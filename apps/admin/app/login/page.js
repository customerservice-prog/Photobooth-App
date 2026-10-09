import './login.css';
import {adminLoginConfigured,adminLoginErrorMessage} from '../../lib/admin-login.mjs';
export const dynamic='force-dynamic';
export default function Login({searchParams={}}){
 const ready=adminLoginConfigured(),error=ready?adminLoginErrorMessage(searchParams.error):adminLoginErrorMessage('setup');
 return <main className="staffLogin"><div className="staffLoginPanel"><h1>Staff sign in</h1><p>Use the owner password to prepare events and manage saved photos.</p>{error&&<p className="staffLoginError" role="alert">{error}</p>}<form method="POST" action="/api/auth/login"><label>Owner password <input type="password" name="password" minLength={12} maxLength={180} autoComplete="current-password" required disabled={!ready}/></label><button disabled={!ready}>Sign in</button></form></div></main>
}

import './login.css';
export default function Login(){return <main className="staffLogin"><div className="staffLoginPanel"><h1>Staff sign in</h1><form method="POST" action="/api/auth/login"><label>Owner password <input type="password" name="password" required/></label><button>Sign in</button></form></div></main>}

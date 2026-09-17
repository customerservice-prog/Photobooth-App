import Link from "next/link";

export const metadata = {
  title: "Friendly Photo Booth — Studio",
  description: "Premium photo booth operations for Friendly Party Rental.",
};

const navItems = [
  ["/dashboard", "✦", "Overview"], ["/events", "◈", "Events"], ["/booths", "◉", "Booths"],
  ["/templates", "◇", "Design Studio"], ["/photos", "▣", "Photos"], ["/galleries", "▦", "Galleries"],
  ["/customers", "◎", "Customers"], ["/employees", "♙", "Team"], ["/reports", "⌁", "Reports"], ["/settings", "⚙", "Settings"],
];

export default function RootLayout({ children }) {
  return <html lang="en"><body>
    <style>{`
      *{box-sizing:border-box} body{margin:0;background:#090a0d;color:#f7f3ea;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;background-image:radial-gradient(circle at 85% 0%,rgba(198,164,93,.12),transparent 30%)}
      a{color:inherit}.shell{display:flex;min-height:100vh}.side{width:260px;position:fixed;inset:0 auto 0 0;padding:28px 18px;border-right:1px solid #24231f;background:rgba(10,11,14,.96);backdrop-filter:blur(20px);z-index:20}.content{margin-left:260px;width:calc(100% - 260px);min-height:100vh}.brand{display:flex;gap:12px;align-items:center;padding:0 10px 27px;border-bottom:1px solid #24231f;margin-bottom:18px;text-decoration:none}.mark{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#e7ca87,#8f6a2d);color:#17120a;font-size:21px;box-shadow:0 8px 30px rgba(197,159,82,.16)}.brand strong{display:block;font-family:Georgia,serif;font-size:18px;letter-spacing:.2px}.brand small{display:block;color:#8f8a7e;font-size:10px;letter-spacing:1.7px;text-transform:uppercase;margin-top:3px}.nav{display:grid;gap:5px}.nav a{display:flex;align-items:center;gap:12px;text-decoration:none;color:#aaa69d;padding:11px 12px;border-radius:10px;font-size:14px;transition:.18s}.nav a:hover{color:#fff;background:#17181c}.ico{width:22px;color:#c9a963;text-align:center}.sidefoot{position:absolute;bottom:24px;left:28px;right:28px;color:#716e67;font-size:11px;line-height:1.5}.elite{color:#c8a760;letter-spacing:1.2px;text-transform:uppercase;font-size:9px}
      .page{padding:42px 46px;max-width:1500px;margin:auto}.eyebrow{color:#c9a963;text-transform:uppercase;letter-spacing:2.3px;font-size:10px;font-weight:700}.title{font-family:Georgia,serif;font-size:42px;font-weight:400;margin:8px 0;color:#fff}.muted{color:#96928a}.card{background:linear-gradient(145deg,rgba(24,25,29,.92),rgba(15,16,19,.92));border:1px solid #292923;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.22)}.btn{display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border-radius:10px;text-decoration:none;border:1px solid #3b3323;background:linear-gradient(135deg,#d7b96d,#a37c35);color:#17120a;font-weight:750;font-size:13px}.btn2{background:#17181c;color:#ddd7ca;border-color:#2b2c31}.input{width:100%;padding:12px 13px;border-radius:10px;border:1px solid #303137;background:#101115;color:#fff;outline:none}.input:focus{border-color:#a8884b;box-shadow:0 0 0 3px rgba(190,153,77,.1)}
      @media(max-width:850px){.side{width:76px;padding:24px 10px}.brand{padding:0 7px 22px}.brand div:not(.mark),.nav span:last-child,.sidefoot{display:none}.nav a{justify-content:center}.content{margin-left:76px;width:calc(100% - 76px)}.page{padding:28px 20px}.title{font-size:32px}}
    `}</style>
    <div className="shell"><aside className="side"><Link href="/dashboard" className="brand"><div className="mark">✦</div><div><strong>Friendly Booth</strong><small>Event Studio</small></div></Link><nav className="nav">{navItems.map(([href,icon,label])=><Link key={href} href={href}><span className="ico">{icon}</span><span>{label}</span></Link>)}</nav><div className="sidefoot"><div className="elite">Friendly Party Rental</div>Premium booth operations<br/>Syracuse, New York</div></aside><section className="content">{children}</section></div>
  </body></html>;
}

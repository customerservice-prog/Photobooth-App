import "./globals.css";
import "./interaction-fix.css";
export const metadata={title:"Friendly Photo Booth",description:"Friendly Party Rental wedding photo booth",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,statusBarStyle:"black-translucent",title:"Friendly Booth"}};
export const viewport={width:"device-width",initialScale:1,maximumScale:1,userScalable:false,viewportFit:"cover"};
export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}

import "./globals.css";
import "./interaction-fix.css";
export const metadata={
  title:"Friendly Booth — Bryan Wedding",
  description:"Friendly Party Rental wedding photo booth",
  manifest:"/manifest.webmanifest",
  icons:{icon:"/icon.svg",apple:"/icon.svg"},
  appleWebApp:{capable:true,statusBarStyle:"default",title:"Friendly Booth"}
};
export const viewport={width:"device-width",initialScale:1,maximumScale:1,userScalable:false,viewportFit:"cover",themeColor:"#fff7f3",colorScheme:"light"};
export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}

import './globals.css';
// The old interaction-fix.css remains in source history, but is deliberately not loaded.
export const metadata={title:'Friendly Photo Booth',description:'Personalized event photos by Friendly Party Rental',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg',apple:'/icon.svg'},appleWebApp:{capable:true,statusBarStyle:'default',title:'Friendly Booth'}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#e4e0d9',colorScheme:'light'};
export default function Layout({children}){return <html lang="en"><body>{children}</body></html>}

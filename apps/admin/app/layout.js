import AdminNavigation from './AdminNavigation';
import './admin.css';
import './owner-workspace.css';
export const metadata={title:'Friendly Photo Booth | Owner',description:'Prepare your event, load the iPad and save the digital gallery.',manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg',apple:'/icon.svg'},appleWebApp:{capable:true,title:'Friendly Booth Owner'}};
export default function RootLayout({children}){
 return <html lang="en"><body><AdminNavigation>{children}</AdminNavigation></body></html>;
}

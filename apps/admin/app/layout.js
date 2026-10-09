import AdminNavigation from './AdminNavigation';
import './admin.css';
import './owner-workspace.css';
export const metadata={title:'Friendly Photo Booth | Owner',description:'Prepare your event, load the iPad and save the digital gallery.'};
export default function RootLayout({children}){
 return <html lang="en"><body><AdminNavigation>{children}</AdminNavigation></body></html>;
}

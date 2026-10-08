import AdminNavigation from './AdminNavigation';
import './admin.css';
export const metadata={title:'Friendly Photo Booth | Staff',description:'Easy event, booth and photo operations for Friendly Party Rental.'};
export default function RootLayout({children}){
 return <html lang="en"><body><AdminNavigation>{children}</AdminNavigation></body></html>;
}

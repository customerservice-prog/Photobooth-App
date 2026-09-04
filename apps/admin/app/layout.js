export const metadata = {
  title: 'Friendly Photo Booth — Admin',
  description: 'Internal admin dashboard for Friendly Party Rental photo booth operations.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#0b0c10',
          color: '#f5f5f5',
        }}
      >
        {children}
      </body>
    </html>
  );
}

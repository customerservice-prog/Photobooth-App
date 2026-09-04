import Link from 'next/link';
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

const thStyle = { padding: '0.5rem', color: '#aaa', textAlign: 'left' };
const tdStyle = { padding: '0.5rem' };

export default async function BoothsPage() {
    let booths = [];
    let dbError = null;

  try {
        booths = await prisma.booth.findMany({
                orderBy: { name: 'asc' },
        });
  } catch (err) {
        dbError = err.message;
  }

  return (
        <main style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Booths</h1>
        <Link href="/booths/new" style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, textDecoration: 'none' }}>
          + Add Booth
            </Link>
            </div>

{dbError && (
          <p style={{ color: '#e05252' }}>Could not load booths: {dbError}</p>
      )}

{!dbError && booths.length === 0 && (
          <p>No booths yet. Click "Add Booth" to register your first booth.</p>
       )}

{!dbError && booths.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Printer</th>
              <th style={thStyle}>Software Version</th>
  </tr>
  </thead>
          <tbody>
{booths.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #222' }}>
                            <td style={tdStyle}>{b.name}</td>
                            <td style={tdStyle}>{b.status}</td>
                            <td style={tdStyle}>{b.printerAdapter}</td>
                            <td style={tdStyle}>{b.softwareVersion || '—'}</td>
            </tr>
                        ))}
</tbody>
  </table>
      )}
</main>
  );
}

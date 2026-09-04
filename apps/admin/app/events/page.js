import Link from 'next/link';
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

const thStyle = { padding: '0.5rem', color: '#aaa', textAlign: 'left' };
const tdStyle = { padding: '0.5rem' };

export default async function EventsPage() {
        let events = [];
        let dbError = null;

  try {
            events = await prisma.event.findMany({
                        include: { customer: true },
                        orderBy: { date: 'asc' },
            });
  } catch (err) {
            dbError = err.message;
  }

  return (
            <main style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Events</h1>
        <Link href="/events/new" style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, textDecoration: 'none' }}>
          + New Event
                </Link>
                </div>

{dbError && (
              <p style={{ color: '#e05252' }}>Could not load events: {dbError}</p>
      )}

{!dbError && events.length === 0 && (
              <p>No events yet. Click "New Event" to create the first one.</p>
       )}

{!dbError && events.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={thStyle}>Event</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Status</th>
      </tr>
      </thead>
          <tbody>
{events.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #222' }}>
                            <td style={tdStyle}>
                              <Link href={`/events/${e.id}`} style={{ color: '#4b8bf5', textDecoration: 'none' }}>
{e.name}
</Link>
      </td>
                <td style={tdStyle}>{e.customer ? e.customer.name : ''}</td>
                <td style={tdStyle}>{new Date(e.date).toLocaleDateString()}</td>
                <td style={tdStyle}>{e.status}</td>
      </tr>
            ))}
                  </tbody>
                  </table>
      )}
</main>
  );
}

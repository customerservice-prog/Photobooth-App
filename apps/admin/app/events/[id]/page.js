import Link from 'next/link';
import { prisma } from '../../../lib/prisma';
import { deleteEvent } from '../actions';

export const dynamic = 'force-dynamic';

const labelStyle = { color: '#aaa', marginBottom: '0.25rem' };
const sectionStyle = { marginBottom: '1.5rem' };

export default async function EventDetailPage({ params }) {
    const event = await prisma.event.findUnique({
          where: { id: params.id },
          include: { customer: true, booth: true, template: true },
    });

  if (!event) {
        return (
                <main style={{ padding: '40px' }}>
          <p>Event not found.</p>
          <Link href="/events">Back to Events</Link>
    </main>
      );
}

  const boundDelete = deleteEvent.bind(null, event.id);

  return (
        <main style={{ padding: '40px', maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>{event.name}</h1>
        <Link href="/events" style={{ color: '#4b8bf5' }}>Back to Events</Link>
    </div>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Status</h3>
        <p>{event.status}</p>
    </section>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Customer</h3>
        <p>{event.customer ? event.customer.name : '—'}</p>
        <p>{event.customer?.email || ''}</p>
        <p>{event.customer?.phone || ''}</p>
    </section>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Event Details</h3>
        <p>Type: {event.eventType || '—'}</p>
        <p>Date: {new Date(event.date).toLocaleDateString()}</p>
        <p>Start: {new Date(event.startTime).toLocaleTimeString()}</p>
        <p>End: {new Date(event.endTime).toLocaleTimeString()}</p>
    </section>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Venue</h3>
        <p>{event.venueName || '—'}</p>
        <p>{event.venueAddress || ''}</p>
    </section>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Internal Notes</h3>
        <p>{event.internalNotes || '—'}</p>
    </section>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Booth</h3>
        <p>{event.booth ? event.booth.name : 'Not assigned yet'}</p>
    </section>

      <section style={sectionStyle}>
            <h3 style={labelStyle}>Template</h3>
        <p>{event.template ? event.template.name : 'Not assigned yet'}</p>
    </section>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link href={`/events/${event.id}/edit`} style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, textDecoration: 'none' }}>
          Edit Event
            </Link>
        <form action={boundDelete}>
          <button type="submit" style={{ background: '#e05252', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
            Delete Event
              </button>
              </form>
              </div>
              </main>
  );
}

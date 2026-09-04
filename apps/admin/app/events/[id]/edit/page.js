import Link from 'next/link';
import { prisma } from '../../../../lib/prisma';
import { updateEvent } from '../../actions';

export const dynamic = 'force-dynamic';

const fieldsetStyle = { border: '1px solid #333', borderRadius: 6, padding: '1rem', marginBottom: '1rem' };
const inputStyle = { width: '100%', marginBottom: '0.5rem' };

export default async function EditEventPage({ params }) {
    const event = await prisma.event.findUnique({
          where: { id: params.id },
          include: { customer: true },
    });

  if (!event) {
        return (
                <main style={{ padding: '40px' }}>
          <p>Event not found.</p>
          <Link href="/events">Back to Events</Link>
    </main>
      );
}

  const dateValue = new Date(event.date).toISOString().slice(0, 10);
  const startValue = new Date(event.startTime).toISOString().slice(11, 16);
  const endValue = new Date(event.endTime).toISOString().slice(11, 16);

  const boundUpdate = updateEvent.bind(null, event.id);

  return (
        <main style={{ padding: '40px', maxWidth: 600 }}>
      <h1>Edit Event</h1>
      <form action={boundUpdate} style={{ display: 'flex', flexDirection: 'column' }}>
        <fieldset style={fieldsetStyle}>
              <legend>Customer</legend>
          <label>Name*<br />
                <input name="customerName" defaultValue={event.customer?.name || ''} required style={inputStyle} />
    </label>
          <label>Email<br />
                <input name="customerEmail" defaultValue={event.customer?.email || ''} style={inputStyle} />
    </label>
          <label>Phone<br />
                <input name="customerPhone" defaultValue={event.customer?.phone || ''} style={inputStyle} />
    </label>
    </fieldset>

        <fieldset style={fieldsetStyle}>
              <legend>Event</legend>
          <label>Event Name*<br />
                <input name="eventName" defaultValue={event.name} required style={inputStyle} />
    </label>
          <label>Event Type<br />
                <input name="eventType" defaultValue={event.eventType || ''} style={inputStyle} />
    </label>
          <label>Date*<br />
                <input type="date" name="date" defaultValue={dateValue} required style={inputStyle} />
    </label>
          <label>Start Time*<br />
                <input type="time" name="startTime" defaultValue={startValue} required style={inputStyle} />
    </label>
          <label>End Time*<br />
                <input type="time" name="endTime" defaultValue={endValue} required style={inputStyle} />
    </label>
          <label>Venue Name<br />
                <input name="venueName" defaultValue={event.venueName || ''} style={inputStyle} />
    </label>
          <label>Venue Address<br />
                <input name="venueAddress" defaultValue={event.venueAddress || ''} style={inputStyle} />
    </label>
          <label>Internal Notes<br />
                <textarea name="internalNotes" defaultValue={event.internalNotes || ''} style={inputStyle} />
    </label>
    </fieldset>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
            Save Changes
              </button>
          <Link href={`/events/${event.id}`} style={{ color: '#aaa' }}>Cancel</Link>
    </div>
              </form>
              </main>
  );
}

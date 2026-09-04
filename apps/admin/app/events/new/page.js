import { createEvent } from '../actions';

const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    marginBottom: '0.75rem',
    borderRadius: 4,
    border: '1px solid #444',
    background: '#111',
    color: 'white',
};

const fieldsetStyle = {
    border: '1px solid #333',
    borderRadius: 8,
    padding: '1rem',
    marginBottom: '1rem',
};

export default function NewEventPage() {
    return (
          <div style={{ padding: '2rem', maxWidth: 640 }}>
      <h1 style={{ marginBottom: '0.25rem' }}>New Event</h1>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>
        Enter the basics now. Booth, template, and printing/sharing options can be configured afterwards.
          </p>
      <form action={createEvent}>
                  <fieldset style={fieldsetStyle}>
                    <legend>Customer</legend>
          <label>Customer name *<br />
                      <input name="customerName" required style={inputStyle} />
          </label>
          <label>Email<br />
                      <input name="customerEmail" type="email" style={inputStyle} />
          </label>
          <label>Phone<br />
                      <input name="customerPhone" style={inputStyle} />
          </label>
          </fieldset>

        <fieldset style={fieldsetStyle}>
                    <legend>Event</legend>
          <label>Event name *<br />
                      <input name="eventName" required style={inputStyle} placeholder='e.g. Smith Wedding' />
          </label>
          <label>Event type<br />
                      <input name="eventType" style={inputStyle} placeholder="wedding, birthday, corporate..." />
          </label>
          <label>Date *<br />
                      <input name="date" type="date" required style={inputStyle} />
          </label>
          <label>Start time *<br />
                      <input name="startTime" type="time" required style={inputStyle} />
          </label>
          <label>End time *<br />
                      <input name="endTime" type="time" required style={inputStyle} />
          </label>
          <label>Venue name<br />
                      <input name="venueName" style={inputStyle} />
          </label>
          <label>Venue address<br />
                      <input name="venueAddress" style={inputStyle} />
          </label>
          <label>Internal notes<br />
                      <textarea name="internalNotes" style={{ ...inputStyle, height: 80 }} />
          </label>
          </fieldset>

        <button
          type="submit"
          style={{
                        padding: '0.75rem 1.25rem',
                        background: '#4b8bf5',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
          }}
        >
          Save Event
            </button>
            </form>
            </div>
            );
}

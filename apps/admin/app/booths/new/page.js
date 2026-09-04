import Link from 'next/link';
import { createBooth } from '../actions';

const fieldsetStyle = { border: '1px solid #333', borderRadius: 6, padding: '1rem', marginBottom: '1rem' };
const inputStyle = { width: '100%', marginBottom: '0.5rem' };

export default function NewBoothPage() {
    return (
          <main style={{ padding: '40px', maxWidth: 500 }}>
      <h1>Add Booth</h1>
      <form action={createBooth} style={{ display: 'flex', flexDirection: 'column' }}>
        <fieldset style={fieldsetStyle}>
            <legend>Booth</legend>
          <label>Name*<br />
              <input name="name" placeholder="Booth 01" required style={inputStyle} />
  </label>
          <label>Printer Adapter<br />
              <select name="printerAdapter" defaultValue="canon_selphy" style={inputStyle}>
                <option value="canon_selphy">Canon SELPHY</option>
  </select>
  </label>
  </fieldset>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
            Save Booth
              </button>
          <Link href="/booths" style={{ color: '#aaa' }}>Cancel</Link>
              </div>
              </form>
              </main>
  );
}

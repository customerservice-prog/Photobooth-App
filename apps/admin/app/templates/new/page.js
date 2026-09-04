import Link from 'next/link';
import { createTemplate } from '../actions';

const fieldsetStyle = { border: '1px solid #333', borderRadius: 6, padding: '1rem', marginBottom: '1rem' };
const inputStyle = { width: '100%', marginBottom: '0.5rem' };

const CATEGORIES = ['Wedding', 'Birthday', 'Graduation', 'Sweet 16', 'Baby Shower', 'Corporate', 'Christmas', 'Holiday', 'Prom', 'Anniversary', 'Quinceanera', 'School', 'General Party'];

export default function NewTemplatePage() {
    return (
          <main style={{ padding: '40px', maxWidth: 500 }}>
      <h1>Add Template</h1>
      <form action={createTemplate} style={{ display: 'flex', flexDirection: 'column' }}>
        <fieldset style={fieldsetStyle}>
            <legend>Template</legend>
          <label>Name*<br />
              <input name="name" placeholder="Classic Wedding Frame" required style={inputStyle} />
  </label>
          <label>Category<br />
              <select name="category" defaultValue="General Party" style={inputStyle}>
{CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                              ))}
</select>
  </label>
          <label>Print Format<br />
              <select name="format" defaultValue="4x6_portrait" style={inputStyle}>
                <option value="4x6_portrait">4x6 Portrait</option>
              <option value="4x6_landscape">4x6 Landscape</option>
              <option value="2x6_strip">2x6 Photo Strip</option>
  </select>
  </label>
  </fieldset>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
            Save Template
              </button>
          <Link href="/templates" style={{ color: '#aaa' }}>Cancel</Link>
              </div>
              </form>
              </main>
  );
}

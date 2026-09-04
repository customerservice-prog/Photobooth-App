import Link from 'next/link';
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

const thStyle = { padding: '0.5rem', color: '#aaa', textAlign: 'left' };
const tdStyle = { padding: '0.5rem' };

export default async function TemplatesPage() {
    let templates = [];
    let dbError = null;

  try {
        templates = await prisma.template.findMany({
                where: { archived: false },
                orderBy: { name: 'asc' },
        });
  } catch (err) {
        dbError = err.message;
  }

  return (
        <main style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Templates</h1>
        <Link href="/templates/new" style={{ background: '#4b8bf5', color: 'white', padding: '0.6rem 1rem', borderRadius: 6, textDecoration: 'none' }}>
          + Add Template
            </Link>
            </div>

{dbError && (
          <p style={{ color: '#e05252' }}>Could not load templates: {dbError}</p>
      )}

{!dbError && templates.length === 0 && (
          <p>No templates yet. Click "Add Template" to create your first one.</p>
       )}

{!dbError && templates.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Format</th>
  </tr>
  </thead>
          <tbody>
{templates.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #222' }}>
                               <td style={tdStyle}>{t.name}</td>
                               <td style={tdStyle}>{t.category}</td>
                               <td style={tdStyle}>{t.format}</td>
               </tr>
                           ))}
</tbody>
  </table>
      )}
</main>
  );
}

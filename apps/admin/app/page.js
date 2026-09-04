export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', margin: 0 }}>Friendly Photo Booth</h1>
      <p style={{ opacity: 0.7, maxWidth: 480 }}>
        Admin dashboard placeholder. Phase 1 scaffolding is in progress — see
        docs/phases.md in the repository for current status.
      </p>
    </main>
  );
}

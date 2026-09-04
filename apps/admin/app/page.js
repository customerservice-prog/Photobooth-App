import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "40px" }}>
      <h1>Friendly Photo Booth</h1>
      <p>
        Phase 1 admin scaffolding is live. Use the navigation on the left to
        explore the placeholder sections while real features are built out.
      </p>
      <p>
        <Link href="/dashboard" style={{ color: "#8ab4f8" }}>
          Go to Dashboard &rarr;
        </Link>
      </p>
    </main>
  );
}

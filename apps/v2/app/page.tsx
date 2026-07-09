export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <h1>Nusa Food Task System — v2</h1>
      <p>
        Skeleton v2 (Next.js + REST API + PostgreSQL). Dikembangkan paralel; v1 tetap berjalan
        tanpa terpengaruh.
      </p>
      <p>
        Health check: <a href="/api/health">/api/health</a>
      </p>
    </main>
  )
}

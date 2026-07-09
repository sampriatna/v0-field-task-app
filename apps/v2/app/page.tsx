import Link from "next/link"

export default function Home() {
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Nusa Food Task System — v2</h1>
          <div className="sub">Next.js + REST API + PostgreSQL. Dikembangkan paralel; v1 tetap berjalan.</div>
        </div>
      </div>
      <div className="card" style={{ padding: 20 }}>
        <p style={{ marginTop: 0 }}>Halaman yang tersedia saat ini:</p>
        <ul style={{ lineHeight: 2 }}>
          <li>
            <Link href="/dashboard">Dashboard v2</Link> — ringkasan tugas &amp; checklist
          </li>
          <li>
            <a href="/api/health">/api/health</a> — health check + koneksi DB
          </li>
        </ul>
      </div>
    </main>
  )
}

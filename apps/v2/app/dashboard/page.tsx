"use client"

import { useCallback, useEffect, useState } from "react"
import { apiGet } from "@/lib/api-client"
import { statusLabel, PRIORITY_TONE, type Tone } from "@/lib/labels"
import { StatTile } from "@/components/stat-tile"
import { Badge } from "@/components/badge"

interface Summary {
  total: number
  open: number
  submitted: number
  done: number
  late: number
  revisi: number
}
interface FullSummary {
  tasks: Summary
  checklists: Summary
}
interface TaskRow {
  task_id: string
  outlet: string | null
  area: string | null
  category: string | null
  task_title: string
  priority: string
  pic_name: string
  deadline: string | null
  status: string
  is_late: boolean
}
interface Outlet {
  code: string
  name: string
}

const TASK_TILES: { key: keyof Summary; label: string; tone: Tone; filter?: string }[] = [
  { key: "total", label: "Total Tugas", tone: "neutral" },
  { key: "open", label: "Open", tone: "info", filter: "OPEN" },
  { key: "submitted", label: "Submitted", tone: "warn", filter: "SUBMITTED" },
  { key: "done", label: "Done", tone: "success", filter: "DONE" },
  { key: "late", label: "Late", tone: "danger" },
  { key: "revisi", label: "Revisi", tone: "orange", filter: "REVISI" },
]

const CHECKLIST_TILES: { key: keyof Summary; label: string; tone: Tone }[] = [
  { key: "total", label: "Total Checklist", tone: "neutral" },
  { key: "open", label: "Belum Dikerjakan", tone: "info" },
  { key: "submitted", label: "Sudah Submit", tone: "warn" },
  { key: "done", label: "Selesai", tone: "success" },
  { key: "late", label: "Telat", tone: "danger" },
  { key: "revisi", label: "Perlu Revisi", tone: "orange" },
]

function fmtDeadline(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d)
}

export default function DashboardPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outlet, setOutlet] = useState("")
  const [status, setStatus] = useState("")

  const [summary, setSummary] = useState<FullSummary | null>(null)
  const [tasks, setTasks] = useState<TaskRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Outlet[]>("/api/outlets")
      .then((r) => setOutlets(r.data))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      if (outlet) q.set("outlet", outlet)
      const taskQ = new URLSearchParams(q)
      if (status) taskQ.set("status", status)
      taskQ.set("limit", "10")

      const [sum, list] = await Promise.all([
        apiGet<FullSummary>(`/api/dashboard/summary?${q.toString()}`),
        apiGet<TaskRow[]>(`/api/tasks?${taskQ.toString()}`),
      ])
      setSummary(sum.data)
      setTasks(list.data)
      setTotal(list.meta?.total ?? list.data.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data")
      setSummary(null)
      setTasks(null)
    } finally {
      setLoading(false)
    }
  }, [outlet, status])

  useEffect(() => {
    load()
  }, [load])

  const toggleStatus = (filter?: string) => {
    if (!filter) return
    setStatus((cur) => (cur === filter ? "" : filter))
  }

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Dashboard v2</h1>
          <div className="sub">Nusa Food Task System — data langsung dari REST API v2</div>
        </div>
        <button type="button" className="btn" onClick={load} disabled={loading}>
          {loading ? "Memuat…" : "↻ Refresh"}
        </button>
      </div>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="outlet">Outlet</label>
          <select id="outlet" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="">Semua outlet</option>
            {outlets.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status tugas</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            <option value="OPEN">Open</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="DONE">Done</option>
            <option value="REVISI">Revisi</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="card">
          <div className="state error">
            ⚠ {error}
            <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
              Pastikan <code>DATABASE_URL</code> terisi dan migrasi + seed sudah dijalankan.
            </div>
          </div>
        </div>
      ) : null}

      <div className="section-title">Tugas Manual</div>
      <div className="stat-grid">
        {TASK_TILES.map((t) => (
          <StatTile
            key={t.key}
            label={t.label}
            value={summary?.tasks[t.key] ?? 0}
            tone={t.tone}
            loading={loading && !summary}
            active={!!t.filter && status === t.filter}
            onClick={t.filter ? () => toggleStatus(t.filter) : undefined}
          />
        ))}
      </div>

      <div className="section-title">Checklist</div>
      <div className="stat-grid">
        {CHECKLIST_TILES.map((t) => (
          <StatTile
            key={t.key}
            label={t.label}
            value={summary?.checklists[t.key] ?? 0}
            tone={t.tone}
            loading={loading && !summary}
          />
        ))}
      </div>

      <div className="section-title">
        Tugas Terbaru{status ? ` — ${statusLabel(status).label}` : ""} ({total})
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tugas</th>
                <th>Outlet</th>
                <th>Area</th>
                <th>PIC</th>
                <th>Deadline</th>
                <th>Prioritas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks && tasks.length > 0
                ? tasks.map((t) => {
                    const s = statusLabel(t.is_late && t.status !== "DONE" ? "LATE" : t.status)
                    return (
                      <tr key={t.task_id}>
                        <td className="title-cell">
                          {t.task_title}
                          <div className="mono">{t.task_id}</div>
                        </td>
                        <td>{t.outlet ?? "—"}</td>
                        <td>{t.area ?? "—"}</td>
                        <td>{t.pic_name}</td>
                        <td>{fmtDeadline(t.deadline)}</td>
                        <td>
                          <Badge label={t.priority} tone={PRIORITY_TONE[t.priority] ?? "neutral"} />
                        </td>
                        <td>
                          <Badge label={s.label} tone={s.tone} />
                        </td>
                      </tr>
                    )
                  })
                : null}
            </tbody>
          </table>
        </div>
        {loading && !tasks ? <div className="state">Memuat tugas…</div> : null}
        {!loading && tasks && tasks.length === 0 ? (
          <div className="state">Tidak ada tugas untuk filter ini.</div>
        ) : null}
      </div>

      <p className="footnote">
        v1 tidak terpengaruh — halaman ini murni membaca REST API v2 (<code>/api/dashboard/summary</code>,{" "}
        <code>/api/tasks</code>).
      </p>
    </main>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiGet } from "@/lib/api-client"
import { statusLabel, PRIORITY_TONE } from "@/lib/labels"
import { fmtDeadline } from "@/lib/format"
import type { Outlet, TaskRow } from "@/lib/client-types"
import { Badge } from "@/components/badge"

const LIMIT = 20

export default function TasksPage() {
  const router = useRouter()
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outlet, setOutlet] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const [tasks, setTasks] = useState<TaskRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Outlet[]>("/api/outlets")
      .then((r) => setOutlets(r.data))
      .catch(() => {})
  }, [])

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1)
  }, [outlet, status])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      if (outlet) q.set("outlet", outlet)
      if (status) q.set("status", status)
      q.set("page", String(page))
      q.set("limit", String(LIMIT))
      const res = await apiGet<TaskRow[]>(`/api/tasks?${q.toString()}`)
      setTasks(res.data)
      setTotal(res.meta?.total ?? res.data.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data")
      setTasks(null)
    } finally {
      setLoading(false)
    }
  }, [outlet, status, page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const from = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const to = Math.min(page * LIMIT, total)

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <Link href="/dashboard">Dashboard</Link> / <span>Tugas</span>
          </div>
          <h1>Daftar Tugas</h1>
          <div className="sub">Semua tugas manual dari REST API v2</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={load} disabled={loading}>
            {loading ? "Memuat…" : "↻ Refresh"}
          </button>
          <Link href="/tasks/new" className="btn btn-accent">
            + Buat Tugas
          </Link>
        </div>
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
          <label htmlFor="status">Status</label>
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
          <div className="state error">⚠ {error}</div>
        </div>
      ) : null}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tugas</th>
                <th>Outlet</th>
                <th>Area</th>
                <th>Kategori</th>
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
                      <tr
                        key={t.task_id}
                        className="row-link"
                        onClick={() => router.push(`/tasks/${t.task_id}`)}
                      >
                        <td className="title-cell">
                          {t.task_title}
                          <div className="mono">{t.task_id}</div>
                        </td>
                        <td>{t.outlet ?? "—"}</td>
                        <td>{t.area ?? "—"}</td>
                        <td>{t.category ?? "—"}</td>
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

      <div className="pager">
        <span className="pager-info">
          {from}–{to} dari {total}
        </span>
        <div className="pager-btns">
          <button
            type="button"
            className="btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Sebelumnya
          </button>
          <span className="pager-info">
            Hal {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { apiGet } from "@/lib/api-client"
import { statusLabel, PRIORITY_TONE } from "@/lib/labels"
import { fmtDateTime } from "@/lib/format"
import type { TaskDetail } from "@/lib/client-types"
import { Badge } from "@/components/badge"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail-field">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{children}</div>
    </div>
  )
}

interface Step {
  label: string
  at: string | null
}

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>()
  const taskId = params.taskId

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId) return
    setLoading(true)
    setError(null)
    apiGet<TaskDetail>(`/api/tasks/${encodeURIComponent(taskId)}`)
      .then((r) => setTask(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat tugas"))
      .finally(() => setLoading(false))
  }, [taskId])

  if (loading) {
    return (
      <main className="container">
        <div className="state">Memuat tugas…</div>
      </main>
    )
  }

  if (error || !task) {
    return (
      <main className="container">
        <div className="crumbs">
          <Link href="/tasks">← Daftar Tugas</Link>
        </div>
        <div className="card">
          <div className="state error">⚠ {error ?? "Tugas tidak ditemukan"}</div>
        </div>
      </main>
    )
  }

  const s = statusLabel(task.is_late && task.status !== "DONE" ? "LATE" : task.status)
  const steps: Step[] = [
    { label: "Dibuat", at: task.created_at },
    { label: "WA Terkirim", at: task.wa_sent_at },
    { label: "Dibuka Staff", at: task.opened_at },
    { label: "Disubmit", at: task.submitted_at },
    { label: "Diverifikasi", at: task.verified_at },
  ]

  return (
    <main className="container">
      <div className="crumbs">
        <Link href="/dashboard">Dashboard</Link> / <Link href="/tasks">Tugas</Link> /{" "}
        <span>{task.task_id}</span>
      </div>

      <div className="page-head">
        <div>
          <h1>{task.task_title}</h1>
          <div className="sub mono">{task.task_id}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge label={task.priority} tone={PRIORITY_TONE[task.priority] ?? "neutral"} />
          <Badge label={s.label} tone={s.tone} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="card detail-card">
          <div className="detail-fields">
            <Field label="Outlet">{task.outlet ?? "—"}</Field>
            <Field label="Area">{task.area ?? "—"}</Field>
            <Field label="Kategori">{task.category ?? "—"}</Field>
            <Field label="PIC">{task.pic_name}</Field>
            <Field label="No. WhatsApp">
              <span className="mono">{task.pic_wa}</span>
            </Field>
            <Field label="Deadline">{fmtDateTime(task.deadline)}</Field>
            <Field label="Dibuat oleh">{task.created_by ?? "—"}</Field>
            <Field label="Mode">{task.checklist_mode ? "Checklist" : "Manual"}</Field>
            <Field label="Durasi">
              {task.duration_minutes != null ? `${task.duration_minutes} menit` : "—"}
            </Field>
          </div>

          {task.task_description ? (
            <>
              <div className="detail-subtitle">Deskripsi</div>
              <pre className="description">{task.task_description}</pre>
            </>
          ) : null}

          {task.staff_note ? (
            <>
              <div className="detail-subtitle">Catatan Staff</div>
              <p className="note">{task.staff_note}</p>
            </>
          ) : null}

          {task.leader_verification ? (
            <>
              <div className="detail-subtitle">Verifikasi Leader</div>
              <p className="note">
                {task.leader_verification}
                {task.verified_by ? ` — ${task.verified_by}` : ""}
              </p>
            </>
          ) : null}
        </div>

        <div className="detail-side">
          <div className="card detail-card">
            <div className="detail-subtitle" style={{ marginTop: 0 }}>
              Riwayat
            </div>
            <ol className="timeline">
              {steps.map((step) => (
                <li key={step.label} className={step.at ? "done" : "pending"}>
                  <span className="tl-dot" aria-hidden />
                  <div>
                    <div className="tl-label">{step.label}</div>
                    <div className="tl-at">{step.at ? fmtDateTime(step.at) : "—"}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card detail-card">
            <div className="detail-subtitle" style={{ marginTop: 0 }}>
              Foto
            </div>
            <div className="photos">
              <figure>
                <figcaption>Sebelum</figcaption>
                {task.before_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={task.before_photo_url} alt="Foto sebelum" />
                ) : (
                  <div className="photo-empty">Tidak ada</div>
                )}
              </figure>
              <figure>
                <figcaption>Sesudah</figcaption>
                {task.after_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={task.after_photo_url} alt="Foto sesudah" />
                ) : (
                  <div className="photo-empty">Tidak ada</div>
                )}
              </figure>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

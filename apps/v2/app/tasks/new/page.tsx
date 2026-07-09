"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiGet, apiPost } from "@/lib/api-client"
import { TICKET_TYPES, TICKET_TYPE_META, type TicketType } from "@/lib/labels"
import type { Outlet, TaskDetail } from "@/lib/client-types"

interface Area {
  id: string
  name: string
  outlet: string | null
}
interface Category {
  id: string
  name: string
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"]

export default function NewTaskPage() {
  const router = useRouter()

  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const [ticketType, setTicketType] = useState<TicketType>("TASK")
  const [outlet, setOutlet] = useState("")
  const [area, setArea] = useState("")
  const [category, setCategory] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [picName, setPicName] = useState("")
  const [picWa, setPicWa] = useState("")
  const [deadline, setDeadline] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<Outlet[]>("/api/outlets").then((r) => setOutlets(r.data)).catch(() => {})
    apiGet<Category[]>("/api/categories").then((r) => setCategories(r.data)).catch(() => {})
  }, [])

  // Areas depend on the selected outlet; reset area when outlet changes.
  useEffect(() => {
    setArea("")
    if (!outlet) {
      setAreas([])
      return
    }
    apiGet<Area[]>(`/api/areas?outlet=${encodeURIComponent(outlet)}`)
      .then((r) => setAreas(r.data))
      .catch(() => setAreas([]))
  }, [outlet])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!outlet || !title.trim() || !picName.trim() || !picWa.trim() || !deadline) {
      setError("Lengkapi field wajib: outlet, judul, PIC, nomor WA, dan deadline.")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ticket_type: ticketType,
        outlet,
        area: area || undefined,
        category: category || undefined,
        task_title: title.trim(),
        task_description: description.trim() || undefined,
        priority,
        pic_name: picName.trim(),
        pic_wa: picWa.trim(),
        // datetime-local is wall-clock; convert to an absolute instant.
        deadline: new Date(deadline).toISOString(),
      }
      const res = await apiPost<TaskDetail>("/api/tasks", payload)
      router.push(`/tasks/${res.data.task_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tugas")
      setSubmitting(false)
    }
  }

  return (
    <main className="container">
      <div className="crumbs">
        <Link href="/dashboard">Dashboard</Link> / <Link href="/tasks">Tugas</Link> /{" "}
        <span>Buat Tugas</span>
      </div>
      <div className="page-head">
        <div>
          <h1>Buat Tugas</h1>
          <div className="sub">Tugas baru akan disimpan via REST API v2</div>
        </div>
      </div>

      <form className="card form-card" onSubmit={handleSubmit}>
        {error ? <div className="form-error">⚠ {error}</div> : null}

        <div className="form-field">
          <label htmlFor="ticketType">Jenis Ticket *</label>
          <select
            id="ticketType"
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value as TicketType)}
            required
          >
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>
                {TICKET_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="outlet">Outlet *</label>
            <select id="outlet" value={outlet} onChange={(e) => setOutlet(e.target.value)} required>
              <option value="">Pilih outlet…</option>
              {outlets.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="area">Area</label>
            <select id="area" value={area} onChange={(e) => setArea(e.target.value)} disabled={!outlet}>
              <option value="">{outlet ? "Pilih area…" : "Pilih outlet dulu"}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="category">Kategori</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Pilih kategori…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="priority">Prioritas</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="title">Judul Tugas *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth: DAILY CLOSING BAR"
            maxLength={500}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="description">Deskripsi</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="• langkah 1&#10;• langkah 2"
            rows={4}
          />
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="picName">Nama PIC *</label>
            <input
              id="picName"
              type="text"
              value={picName}
              onChange={(e) => setPicName(e.target.value)}
              placeholder="cth: Andi"
              maxLength={200}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="picWa">No. WhatsApp *</label>
            <input
              id="picWa"
              type="tel"
              value={picWa}
              onChange={(e) => setPicWa(e.target.value)}
              placeholder="cth: 628123456789"
              maxLength={20}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="deadline">Deadline *</label>
            <input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <Link href="/tasks" className="btn">
            Batal
          </Link>
          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? "Menyimpan…" : "Simpan Tugas"}
          </button>
        </div>
      </form>
    </main>
  )
}

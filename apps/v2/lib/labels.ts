// Status → Indonesian label + tone (CSS class suffix). Ported from v1 status-badge.tsx.

export type Tone =
  | "neutral"
  | "sky"
  | "info"
  | "indigo"
  | "warn"
  | "success"
  | "orange"
  | "danger"

const STATUS: Record<string, { label: string; tone: Tone }> = {
  CREATED: { label: "Dibuat", tone: "neutral" },
  SENT: { label: "Terkirim", tone: "sky" },
  WA_FAILED: { label: "WA Gagal", tone: "danger" },
  OPEN: { label: "Belum Dikerjakan", tone: "info" },
  OPENED: { label: "Dibuka", tone: "indigo" },
  SUBMITTED: { label: "Terkirim", tone: "warn" },
  RESUBMITTED: { label: "Disubmit Ulang", tone: "warn" },
  WAITING_VERIFICATION: { label: "Menunggu Verifikasi", tone: "warn" },
  DONE: { label: "Selesai", tone: "success" },
  VERIFIED: { label: "Terverifikasi", tone: "success" },
  REVISI: { label: "Perlu Revisi", tone: "orange" },
  REVISION: { label: "Perlu Revisi", tone: "orange" },
  REVISION_REQUESTED: { label: "Perlu Revisi", tone: "orange" },
  LATE: { label: "Terlambat", tone: "danger" },
}

export function statusLabel(status: string): { label: string; tone: Tone } {
  return STATUS[(status || "").toUpperCase()] ?? { label: status || "Unknown", tone: "neutral" }
}

export const PRIORITY_TONE: Record<string, Tone> = {
  Low: "neutral",
  Medium: "sky",
  High: "orange",
  Urgent: "danger",
}

// Work Log ticket types (order = display order in forms/filters).
export const TICKET_TYPES = ["TASK", "ISSUE", "COACHING", "CHECKLIST"] as const
export type TicketType = (typeof TICKET_TYPES)[number]

export const TICKET_TYPE_META: Record<TicketType, { label: string; tone: Tone }> = {
  TASK: { label: "Tugas", tone: "info" },
  ISSUE: { label: "Issue", tone: "danger" },
  COACHING: { label: "Coaching", tone: "indigo" },
  CHECKLIST: { label: "Checklist", tone: "sky" },
}

export function ticketTypeLabel(t: string): { label: string; tone: Tone } {
  return TICKET_TYPE_META[t as TicketType] ?? { label: t || "—", tone: "neutral" }
}

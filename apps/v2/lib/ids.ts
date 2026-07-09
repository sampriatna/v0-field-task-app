import { randomBytes } from "node:crypto"

// ID generation preserving v1 formats (see docs/V2_DATABASE_SCHEMA.md §ID Format).

// YYYYMMDD in WIB (Asia/Jakarta), matching how v1 stamps ids.
export function todayStampWIB(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return `${get("year")}${get("month")}${get("day")}`
}

// TASK-YYYYMMDD-NNNN (4-digit zero-padded daily sequence).
export function formatTaskId(stamp: string, seq: number): string {
  return `TASK-${stamp}-${String(seq).padStart(4, "0")}`
}

// 32-char alphanumeric token.
export function generateToken(): string {
  return randomBytes(24).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)
}

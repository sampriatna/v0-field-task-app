import { NextResponse } from "next/server"

// Standard response envelope — see docs/V2_API_SPEC.md.
export interface Meta {
  page: number
  limit: number
  total: number
}

export function ok<T>(data: T, meta?: Meta, init?: ResponseInit) {
  return NextResponse.json({ success: true, data, error: null, ...(meta ? { meta } : {}) }, init)
}

export function fail(error: string, code: string, status: number) {
  return NextResponse.json({ success: false, data: null, error, code }, { status })
}

// Error codes → HTTP status + default Indonesian message (docs/V2_API_SPEC.md §Error Codes).
export const ERRORS = {
  UNAUTHORIZED: { status: 401, message: "Sesi tidak valid, silakan login ulang" },
  FORBIDDEN: { status: 403, message: "Anda tidak memiliki akses" },
  TASK_NOT_FOUND: { status: 404, message: "Tugas tidak ditemukan" },
  INVALID_TOKEN: { status: 403, message: "Token tidak valid" },
  VALIDATION_ERROR: { status: 422, message: "Data tidak valid" },
  INTERNAL_ERROR: { status: 500, message: "Terjadi kesalahan pada server" },
} as const

export function failWith(code: keyof typeof ERRORS, overrideMessage?: string) {
  const e = ERRORS[code]
  return fail(overrideMessage ?? e.message, code, e.status)
}

// Parse & clamp pagination query params.
export function parsePaging(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50
  const limit = Math.min(200, Math.max(1, limitRaw))
  return { page, limit, skip: (page - 1) * limit }
}

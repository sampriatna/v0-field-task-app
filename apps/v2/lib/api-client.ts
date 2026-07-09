// Typed fetch wrapper for the v2 API envelope ({ success, data, error, meta }).

export interface Meta {
  page: number
  limit: number
  total: number
}

export interface Envelope<T> {
  success: boolean
  data: T | null
  error: string | null
  code?: string
  meta?: Meta
}

export interface ApiResult<T> {
  data: T
  meta?: Meta
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(path, { ...init, headers: { Accept: "application/json", ...init?.headers } })

  let body: Envelope<T>
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    throw new Error(`Respons tidak valid dari server (HTTP ${res.status})`)
  }

  if (!res.ok || !body.success || body.data === null) {
    throw new Error(body.error ?? `Gagal memuat data (HTTP ${res.status})`)
  }

  return { data: body.data, meta: body.meta }
}

export async function apiPost<T>(path: string, payload: unknown): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  })

  let body: Envelope<T>
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    throw new Error(`Respons tidak valid dari server (HTTP ${res.status})`)
  }

  if (!res.ok || !body.success || body.data === null) {
    throw new Error(body.error ?? `Gagal menyimpan data (HTTP ${res.status})`)
  }

  return { data: body.data, meta: body.meta }
}

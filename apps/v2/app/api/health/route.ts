import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/health — liveness + DB connectivity probe for v2.
export async function GET() {
  const startedAt = Date.now()

  let dbStatus: "up" | "down" = "down"
  let dbError: string | undefined

  try {
    await db.$queryRaw`SELECT 1`
    dbStatus = "up"
  } catch (err) {
    dbError = err instanceof Error ? err.message : "unknown error"
  }

  const body = {
    status: dbStatus === "up" ? "ok" : "degraded",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "2.0.0",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: dbStatus, ...(dbError ? { error: dbError } : {}) },
    },
    latencyMs: Date.now() - startedAt,
  }

  return NextResponse.json(body, { status: dbStatus === "up" ? 200 : 503 })
}

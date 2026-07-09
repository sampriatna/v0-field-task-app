import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"

export const dynamic = "force-dynamic"

// GET /api/outlets — list outlets (GAS getOutlets).
export async function GET() {
  try {
    const rows = await db.outlet.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    })
    return ok(rows.map((o) => ({ id: o.id, code: o.code, name: o.name, is_active: o.isActive })))
  } catch (err) {
    console.error("GET /api/outlets failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

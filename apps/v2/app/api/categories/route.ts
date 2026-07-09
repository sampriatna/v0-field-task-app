import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"

export const dynamic = "force-dynamic"

// GET /api/categories — list categories (GAS getCategories).
export async function GET() {
  try {
    const rows = await db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })
    return ok(rows.map((c) => ({ id: c.id, name: c.name, is_active: c.isActive })))
  } catch (err) {
    console.error("GET /api/categories failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

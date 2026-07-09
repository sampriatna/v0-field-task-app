import type { NextRequest } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"

export const dynamic = "force-dynamic"

// GET /api/areas — list areas, optional ?outlet= filter (GAS getAreas).
export async function GET(req: NextRequest) {
  const outlet = req.nextUrl.searchParams.get("outlet")
  const where: Prisma.AreaWhereInput = { isActive: true }
  if (outlet) where.outlet = { code: outlet }

  try {
    const rows = await db.area.findMany({
      where,
      include: { outlet: true },
      orderBy: { name: "asc" },
    })
    return ok(
      rows.map((a) => ({
        id: a.id,
        name: a.name,
        outlet: a.outlet?.code ?? null,
        is_active: a.isActive,
      })),
    )
  } catch (err) {
    console.error("GET /api/areas failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

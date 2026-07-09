import type { NextRequest } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"
import { serializeStaff } from "@/lib/serializers"

export const dynamic = "force-dynamic"

// GET /api/staff — list staff, optional ?outlet= and ?status= filters (GAS getStaff).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const where: Prisma.StaffWhereInput = {}

  const outlet = sp.get("outlet")
  if (outlet) where.outlet = { code: outlet }

  const status = sp.get("status")
  if (status === "ACTIVE" || status === "INACTIVE") where.status = status

  try {
    const rows = await db.staff.findMany({
      where,
      include: { outlet: true, area: true },
      orderBy: { name: "asc" },
    })
    return ok(rows.map(serializeStaff))
  } catch (err) {
    console.error("GET /api/staff failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

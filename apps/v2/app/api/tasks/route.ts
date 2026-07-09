import type { NextRequest } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, failWith, parsePaging } from "@/lib/http"
import { serializeTask } from "@/lib/serializers"
import { STATUS_FILTER_GROUPS } from "@/lib/status"

export const dynamic = "force-dynamic"

// GET /api/tasks — list manual tasks with filters + pagination (GAS getTasks).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = parsePaging(sp)

  const where: Prisma.TaskWhereInput = {}

  const outlet = sp.get("outlet")
  if (outlet) where.outlet = { code: outlet }

  const status = sp.get("status")
  if (status) {
    const group = STATUS_FILTER_GROUPS[status.toUpperCase()]
    where.status = group ? { in: group } : (status as Prisma.TaskWhereInput["status"])
  }

  const pic = sp.get("pic")
  if (pic) where.picWa = pic

  const checklistMode = sp.get("checklist_mode")
  if (checklistMode !== null) where.checklistMode = checklistMode === "true"

  const dateFrom = sp.get("date_from")
  const dateTo = sp.get("date_to")
  if (dateFrom || dateTo) {
    where.deadline = {}
    if (dateFrom) (where.deadline as Prisma.DateTimeFilter).gte = new Date(dateFrom)
    if (dateTo) (where.deadline as Prisma.DateTimeFilter).lte = new Date(`${dateTo}T23:59:59.999`)
  }

  try {
    const [rows, total] = await Promise.all([
      db.task.findMany({
        where,
        include: { outlet: true, area: true, category: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.task.count({ where }),
    ])

    return ok(rows.map(serializeTask), { page, limit, total })
  } catch (err) {
    console.error("GET /api/tasks failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

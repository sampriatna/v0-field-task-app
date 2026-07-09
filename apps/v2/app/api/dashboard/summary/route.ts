import type { NextRequest } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"
import { statusBucket } from "@/lib/status"

export const dynamic = "force-dynamic"

interface Summary {
  total: number
  open: number
  submitted: number
  done: number
  late: number
  revisi: number
}

const empty = (): Summary => ({ total: 0, open: 0, submitted: 0, done: 0, late: 0, revisi: 0 })

// GET /api/dashboard/summary?outlet=&date_from=&date_to= (GAS getDashboardSummary).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const outlet = sp.get("outlet")
  const dateFrom = sp.get("date_from")
  const dateTo = sp.get("date_to")

  const deadline: Prisma.DateTimeFilter = {}
  if (dateFrom) deadline.gte = new Date(dateFrom)
  if (dateTo) deadline.lte = new Date(`${dateTo}T23:59:59.999`)
  const hasDate = dateFrom || dateTo

  const taskWhere: Prisma.TaskWhereInput = { checklistMode: false }
  if (outlet) taskWhere.outlet = { code: outlet }
  if (hasDate) taskWhere.deadline = deadline

  const reportWhere: Prisma.ChecklistReportWhereInput = {}
  if (outlet) reportWhere.outlet = { code: outlet }
  if (hasDate) reportWhere.deadline = deadline

  try {
    const [taskGroups, taskLate, reportGroups, reportLate] = await Promise.all([
      db.task.groupBy({ by: ["status"], where: taskWhere, _count: { _all: true } }),
      db.task.count({ where: { ...taskWhere, isLate: true } }),
      db.checklistReport.groupBy({ by: ["status"], where: reportWhere, _count: { _all: true } }),
      db.checklistReport.count({ where: { ...reportWhere, isLate: true } }),
    ])

    const tasks = empty()
    for (const g of taskGroups) {
      const n = g._count._all
      tasks.total += n
      tasks[statusBucket(g.status)] += n
    }
    tasks.late = taskLate

    const checklists = empty()
    for (const g of reportGroups) {
      const n = g._count._all
      checklists.total += n
      switch (g.status) {
        case "DONE":
          checklists.done += n
          break
        case "SUBMITTED":
          checklists.submitted += n
          break
        case "REVISI":
          checklists.revisi += n
          break
        default:
          // OPEN, LATE
          checklists.open += n
      }
    }
    checklists.late = reportLate

    return ok({ tasks, checklists })
  } catch (err) {
    console.error("GET /api/dashboard/summary failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

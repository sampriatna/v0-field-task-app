import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ok, fail, failWith, parsePaging } from "@/lib/http"
import { serializeTask } from "@/lib/serializers"
import { STATUS_FILTER_GROUPS } from "@/lib/status"
import { createTaskSchema, firstIssueMessage } from "@/lib/validation"
import { todayStampWIB, formatTaskId, generateToken } from "@/lib/ids"
import { writeAudit } from "@/lib/audit"

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"

// POST /api/tasks — create a manual task (GAS createTask). v2-native write;
// GAS dual-write is a later phase (docs/V2_API_SPEC.md §2 "Fase 2").
export async function POST(req: NextRequest) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return failWith("VALIDATION_ERROR", "Body request bukan JSON yang valid")
  }

  const parsed = createTaskSchema.safeParse(json)
  if (!parsed.success) {
    return failWith("VALIDATION_ERROR", firstIssueMessage(parsed.error))
  }
  const input = parsed.data

  try {
    // Resolve master data by human-facing names/codes.
    const outlet = await db.outlet.findUnique({ where: { code: input.outlet } })
    if (!outlet) return failWith("VALIDATION_ERROR", `Outlet '${input.outlet}' tidak ditemukan`)

    const area = input.area
      ? await db.area.findFirst({ where: { outletId: outlet.id, name: input.area } })
      : null
    if (input.area && !area) {
      return failWith("VALIDATION_ERROR", `Area '${input.area}' tidak ada di outlet ini`)
    }

    const category = input.category
      ? await db.category.findUnique({ where: { name: input.category } })
      : null
    if (input.category && !category) {
      return failWith("VALIDATION_ERROR", `Kategori '${input.category}' tidak ditemukan`)
    }

    const stamp = todayStampWIB()

    // Retry on the (rare) unique-id race: recompute the daily sequence and retry.
    for (let attempt = 0; attempt < 5; attempt++) {
      const todayCount = await db.task.count({ where: { taskId: { startsWith: `TASK-${stamp}-` } } })
      const taskId = formatTaskId(stamp, todayCount + 1 + attempt)
      const token = generateToken()
      const reportLink = `${APP_URL}/report/${taskId}?token=${token}`

      try {
        const created = await db.$transaction(async (tx) => {
          const task = await tx.task.create({
            data: {
              taskId,
              token,
              outletId: outlet.id,
              areaId: area?.id ?? null,
              categoryId: category?.id ?? null,
              outletName: outlet.name,
              areaName: area?.name ?? null,
              categoryName: category?.name ?? null,
              taskTitle: input.task_title,
              taskDescription: input.task_description || null,
              priority: input.priority,
              picName: input.pic_name,
              picWa: input.pic_wa,
              deadline: new Date(input.deadline),
              beforePhotoUrl: input.before_photo_url ?? null,
              status: "CREATED",
              reportLink,
              sourceVersion: "v2",
            },
            include: { outlet: true, area: true, category: true },
          })

          await writeAudit(
            {
              entityType: "task",
              entityId: taskId,
              action: "created",
              actorType: "leader",
              newValue: { task_title: task.taskTitle, status: task.status, pic_wa: task.picWa },
            },
            tx,
          )

          return task
        })

        return ok(serializeTask(created), undefined, { status: 201 })
      } catch (err) {
        // Unique violation on task_id → retry with a bumped sequence.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          continue
        }
        throw err
      }
    }

    return fail("Gagal membuat ID tugas unik, coba lagi", "INTERNAL_ERROR", 500)
  } catch (err) {
    console.error("POST /api/tasks failed:", err)
    return failWith("INTERNAL_ERROR")
  }
}

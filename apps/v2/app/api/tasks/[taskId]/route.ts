import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"
import { serializeTask } from "@/lib/serializers"

export const dynamic = "force-dynamic"

// GET /api/tasks/:taskId — task detail for admin (GAS getTaskDetail).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params

  try {
    const task = await db.task.findUnique({
      where: { taskId },
      include: { outlet: true, area: true, category: true },
    })

    if (!task) return failWith("TASK_NOT_FOUND")

    return ok(serializeTask(task))
  } catch (err) {
    console.error(`GET /api/tasks/${taskId} failed:`, err)
    return failWith("INTERNAL_ERROR")
  }
}

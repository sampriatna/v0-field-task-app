import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ok, failWith } from "@/lib/http"
import { serializeTask } from "@/lib/serializers"

export const dynamic = "force-dynamic"

// GET /api/tasks/:taskId/public?token= — task detail for the tokenized staff page
// (GAS getTaskByToken). No auth; access is gated by the token.
export async function GET(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const token = req.nextUrl.searchParams.get("token")

  if (!token) return failWith("INVALID_TOKEN")

  try {
    const task = await db.task.findUnique({
      where: { taskId },
      include: { outlet: true, area: true, category: true },
    })

    if (!task) return failWith("TASK_NOT_FOUND")
    if (task.token !== token) return failWith("INVALID_TOKEN")

    return ok(serializeTask(task))
  } catch (err) {
    console.error(`GET /api/tasks/${taskId}/public failed:`, err)
    return failWith("INTERNAL_ERROR")
  }
}

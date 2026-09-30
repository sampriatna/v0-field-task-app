import { NextResponse } from "next/server";
import { updateMilestone } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";
import type { MilestoneStatus } from "@/lib/project-types";

const allowedStatus = new Set<MilestoneStatus>(["NOT_STARTED", "IN_PROGRESS", "DONE", "BLOCKED"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ milestoneId: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const patch: Record<string, unknown> = {};

    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.description !== undefined) patch.description = body.description ? String(body.description) : null;
    if (body.weight !== undefined) patch.weight = Math.max(1, Number(body.weight || 1));
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.evidence_url !== undefined) patch.evidence_url = body.evidence_url ? String(body.evidence_url) : null;
    if (body.status !== undefined) {
      if (!allowedStatus.has(body.status as MilestoneStatus)) {
        return NextResponse.json({ success: false, error: "Status milestone tidak valid" }, { status: 400 });
      }
      patch.status = body.status;
    }

    await updateMilestone(milestoneId, patch);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal memperbarui milestone" },
      { status: 500 }
    );
  }
}

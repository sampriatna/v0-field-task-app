import { NextResponse } from "next/server";
import { updateWorkstream } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";
import type { ProjectHealth, ProjectStatus } from "@/lib/project-types";

const allowedStatus = new Set<ProjectStatus>(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
const allowedHealth = new Set<ProjectHealth>(["ON_TRACK", "NEED_ATTENTION", "BLOCKED", "COMPLETED"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workstreamId: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const patch: Record<string, unknown> = {};

    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.owner_staff_id !== undefined) patch.owner_staff_id = body.owner_staff_id ? String(body.owner_staff_id) : null;
    if (body.weight !== undefined) patch.weight = Math.max(1, Number(body.weight || 1));
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.next_action !== undefined) patch.next_action = body.next_action ? String(body.next_action) : null;
    if (body.blocker !== undefined) patch.blocker = body.blocker ? String(body.blocker) : null;
    if (body.status !== undefined) {
      if (!allowedStatus.has(body.status as ProjectStatus)) {
        return NextResponse.json({ success: false, error: "Status workstream tidak valid" }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (body.health !== undefined) {
      if (!allowedHealth.has(body.health as ProjectHealth)) {
        return NextResponse.json({ success: false, error: "Health workstream tidak valid" }, { status: 400 });
      }
      patch.health = body.health;
    }

    await updateWorkstream(workstreamId, patch);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal memperbarui workstream" },
      { status: 500 }
    );
  }
}

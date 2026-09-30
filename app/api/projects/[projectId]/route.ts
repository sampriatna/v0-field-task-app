import { NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";
import type { ProjectHealth, ProjectStatus } from "@/lib/project-types";

const allowedStatus = new Set<ProjectStatus>(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
const allowedHealth = new Set<ProjectHealth>(["ON_TRACK", "NEED_ATTENTION", "BLOCKED", "COMPLETED"]);

function failure(error: unknown, status = 500) {
  return NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : "Terjadi kesalahan" },
    { status }
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { projectId } = await context.params;
    const project = await getProject(projectId);
    if (!project) return failure(new Error("Project tidak ditemukan"), 404);
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const patch: Record<string, unknown> = {};

    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.goal !== undefined) patch.goal = body.goal ? String(body.goal) : null;
    if (body.lead_staff_id !== undefined) patch.lead_staff_id = body.lead_staff_id ? String(body.lead_staff_id) : null;
    if (body.start_date !== undefined) patch.start_date = body.start_date || null;
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.next_action !== undefined) patch.next_action = body.next_action ? String(body.next_action) : null;
    if (body.blocker !== undefined) patch.blocker = body.blocker ? String(body.blocker) : null;
    if (body.status !== undefined) {
      if (!allowedStatus.has(body.status as ProjectStatus)) return failure(new Error("Status project tidak valid"), 400);
      patch.status = body.status;
    }
    if (body.health !== undefined) {
      if (!allowedHealth.has(body.health as ProjectHealth)) return failure(new Error("Health project tidak valid"), 400);
      patch.health = body.health;
    }

    const project = await updateProject(projectId, patch);
    if (!project) return failure(new Error("Project tidak ditemukan"), 404);
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    if (error instanceof SyntaxError) return failure(new Error("Request tidak valid"), 400);
    return failure(error);
  }
}

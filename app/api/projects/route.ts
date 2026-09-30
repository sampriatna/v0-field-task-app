import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";

function failure(error: unknown, status = 500) {
  return NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : "Terjadi kesalahan" },
    { status }
  );
}

export async function GET(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner") || undefined;
    return NextResponse.json({ success: true, data: await listProjects(owner) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return failure(new Error("Nama project wajib diisi"), 400);

    const project = await createProject({
      name,
      goal: body.goal ? String(body.goal) : null,
      lead_staff_id: body.lead_staff_id ? String(body.lead_staff_id) : null,
      start_date: body.start_date ? String(body.start_date) : null,
      deadline: body.deadline ? String(body.deadline) : null,
      next_action: body.next_action ? String(body.next_action) : null,
      created_by: session.userName || session.userId || "Admin",
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return failure(new Error("Request tidak valid"), 400);
    return failure(error);
  }
}

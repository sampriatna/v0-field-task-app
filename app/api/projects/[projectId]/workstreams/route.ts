import { NextResponse } from "next/server";
import { createWorkstream } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Nama workstream wajib diisi" },
        { status: 400 }
      );
    }

    const project = await createWorkstream(projectId, {
      name,
      owner_staff_id: body.owner_staff_id ? String(body.owner_staff_id) : null,
      weight: Number(body.weight || 1),
      deadline: body.deadline ? String(body.deadline) : null,
      next_action: body.next_action ? String(body.next_action) : null,
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal membuat workstream" },
      { status: 500 }
    );
  }
}

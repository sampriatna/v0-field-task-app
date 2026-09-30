import { NextResponse } from "next/server";
import { createMilestone } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ workstreamId: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { success: false, error: "Nama milestone wajib diisi" },
        { status: 400 }
      );
    }

    await createMilestone(workstreamId, {
      title,
      description: body.description ? String(body.description) : null,
      weight: Number(body.weight || 1),
      deadline: body.deadline ? String(body.deadline) : null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal membuat milestone" },
      { status: 500 }
    );
  }
}

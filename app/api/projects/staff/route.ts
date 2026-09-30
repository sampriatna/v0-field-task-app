import { NextResponse } from "next/server";
import { listProjectStaff } from "@/lib/project-db";
import {
  isSessionPayload,
  requireDailyActivityAdmin,
} from "@/lib/staff-report-api-auth";

export async function GET() {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    return NextResponse.json({ success: true, data: await listProjectStaff() });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gagal memuat staff" },
      { status: 500 }
    );
  }
}

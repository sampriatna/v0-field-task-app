import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { validateStaffReportFromLeader } from "@/lib/leader-monitoring-store";
import type { ValidateStaffReportPayload } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ValidateStaffReportPayload;
    const result = validateStaffReportFromLeader({
      ...body,
      leader_id: body.leader_id || session?.userId || "LEADER",
      leader_name: body.leader_name || session?.userName || "Leader",
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal validasi laporan." }, { status: 500 });
  }
}

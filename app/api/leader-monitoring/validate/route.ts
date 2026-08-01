import { NextResponse } from "next/server";
import { validateStaffReportFromLeader } from "@/lib/leader-monitoring-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { ValidateStaffReportPayload } from "@/lib/types";

export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const body = (await request.json()) as ValidateStaffReportPayload;
    const result = await validateStaffReportFromLeader({
      ...body,
      leader_id: body.leader_id || session.userId || "LEADER",
      leader_name: body.leader_name || session.userName || "Leader",
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

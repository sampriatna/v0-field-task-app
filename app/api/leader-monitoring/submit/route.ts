import { NextResponse } from "next/server";
import { submitLeaderMonitor } from "@/lib/leader-monitoring-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { SubmitLeaderMonitorPayload } from "@/lib/types";

export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const body = (await request.json()) as SubmitLeaderMonitorPayload;
    const payload: SubmitLeaderMonitorPayload = {
      ...body,
      leader_id: body.leader_id || session.userId || "LEADER",
      leader_name: body.leader_name || session.userName || "Leader",
      outlet_id: body.outlet_id || session.userOutlet || body.outlet_id,
    };

    const result = await submitLeaderMonitor(payload);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

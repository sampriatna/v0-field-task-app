import { NextResponse } from "next/server";
import { listLeaderMonitorTemplates } from "@/lib/leader-monitoring-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";

export async function GET(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { searchParams } = new URL(request.url);
    const outlet = searchParams.get("outlet") || undefined;

    return NextResponse.json({
      success: true,
      data: await listLeaderMonitorTemplates(outlet),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { buildLeaderMonitorDashboard } from "@/lib/leader-monitoring-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { LeaderMonitorFilters, LeaderMonitorKind, LeaderFollowUpStatus } from "@/lib/types";

export async function GET(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { searchParams } = new URL(request.url);
    const filters: LeaderMonitorFilters = {
      date: searchParams.get("date") || undefined,
      outlet: searchParams.get("outlet") || session.userOutlet || undefined,
      kind: (searchParams.get("kind") as LeaderMonitorKind | "ALL") || undefined,
      follow_up: (searchParams.get("follow_up") as LeaderFollowUpStatus | "ALL") || undefined,
    };

    return NextResponse.json({
      success: true,
      data: await buildLeaderMonitorDashboard(filters),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

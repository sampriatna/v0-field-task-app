import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { buildLeaderMonitorDashboard } from "@/lib/leader-monitoring-store";
import type { LeaderMonitorFilters, LeaderMonitorKind, LeaderFollowUpStatus } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters: LeaderMonitorFilters = {
    date: searchParams.get("date") || undefined,
    outlet: searchParams.get("outlet") || session?.userOutlet || undefined,
    kind: (searchParams.get("kind") as LeaderMonitorKind | "ALL") || undefined,
    follow_up: (searchParams.get("follow_up") as LeaderFollowUpStatus | "ALL") || undefined,
  };

  return NextResponse.json({
    success: true,
    data: buildLeaderMonitorDashboard(filters),
  });
}

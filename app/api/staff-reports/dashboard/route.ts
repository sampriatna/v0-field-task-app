import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { buildDailyReportDashboard } from "@/lib/staff-report-store";
import type { DailyReportFilters } from "@/lib/types";

/** Admin dashboard — sat set dari store, tanpa nunggu GAS. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters: DailyReportFilters = {
    date: searchParams.get("date") || undefined,
    outlet: searchParams.get("outlet") || undefined,
    staff_id: searchParams.get("staff_id") || undefined,
    report_template_id: searchParams.get("report_template_id") || undefined,
    submit_status:
      (searchParams.get("submit_status") as DailyReportFilters["submit_status"]) || undefined,
  };

  return NextResponse.json({
    success: true,
    data: buildDailyReportDashboard(filters),
  });
}

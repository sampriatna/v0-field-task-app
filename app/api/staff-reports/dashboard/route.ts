import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import {
  buildDailyReportDashboard,
  setStaffCache,
} from "@/lib/staff-report-store";
import type { DailyReportFilters } from "@/lib/types";
import { getStaff } from "@/lib/api-server-staff";

export async function GET(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const staffResult = await getStaff();
    if (staffResult.success && staffResult.data) {
      setStaffCache(staffResult.data);
    }
  } catch {
    // seed
  }

  const { searchParams } = new URL(request.url);
  const filters: DailyReportFilters = {
    date: searchParams.get("date") || undefined,
    outlet: searchParams.get("outlet") || undefined,
    staff_id: searchParams.get("staff_id") || undefined,
    report_template_id: searchParams.get("report_template_id") || undefined,
    submit_status: (searchParams.get("submit_status") as DailyReportFilters["submit_status"]) ||
      undefined,
  };

  return NextResponse.json({
    success: true,
    data: buildDailyReportDashboard(filters),
  });
}

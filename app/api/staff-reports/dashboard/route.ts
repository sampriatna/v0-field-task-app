import { NextResponse } from "next/server";
import { buildDailyReportDashboard } from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { DailyReportFilters } from "@/lib/types";

/** Admin dashboard — data dari persistent store. */
export async function GET(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { searchParams } = new URL(request.url);
    const filters: DailyReportFilters = {
      date: searchParams.get("date") || undefined,
      outlet: searchParams.get("outlet") || undefined,
      staff_id: searchParams.get("staff_id") || undefined,
      report_template_id: searchParams.get("report_template_id") || undefined,
      submit_status:
        (searchParams.get("submit_status") as DailyReportFilters["submit_status"]) ||
        undefined,
    };

    return NextResponse.json({
      success: true,
      data: await buildDailyReportDashboard(filters),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

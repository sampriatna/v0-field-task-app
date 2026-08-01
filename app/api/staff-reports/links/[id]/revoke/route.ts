import { NextResponse } from "next/server";
import { revokeStaffReportLink } from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { id } = await context.params;
    const result = await revokeStaffReportLink(id);
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { revokeStaffReportLink } from "@/lib/staff-report-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = revokeStaffReportLink(id);
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}

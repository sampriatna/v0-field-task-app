import { NextResponse } from "next/server";
import {
  listStaffReportLinks,
  generateStaffReportLink,
  setStaffCache,
} from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { Staff } from "@/lib/types";

function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

async function applyStaffFromBody(body: Record<string, unknown>) {
  if (!Array.isArray(body.staff)) return;
  const staff = (body.staff as Record<string, unknown>[])
    .map((s) => ({
      staff_id: String(s.staff_id || ""),
      name: String(s.name || ""),
      position: String(s.position || ""),
      outlet: (s.outlet || "KBU") as Staff["outlet"],
      area: (s.area || "Dapur") as Staff["area"],
      wa_number: String(s.wa_number || ""),
      role: (s.role || "STAFF") as Staff["role"],
      status: (s.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as Staff["status"],
      created_at: String(s.created_at || ""),
      updated_at: String(s.updated_at || ""),
    }))
    .filter((s) => s.staff_id);
  if (staff.length > 0) await setStaffCache(staff);
}

export async function GET(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    return NextResponse.json({
      success: true,
      data: await listStaffReportLinks(originFromRequest(request)),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const body = await request.json();
    await applyStaffFromBody(body);

    const staffId = String(body.staff_id || "");
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "staff_id wajib diisi" },
        { status: 400 }
      );
    }

    const result = await generateStaffReportLink(staffId, originFromRequest(request));
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
    return dailyActivityStorageErrorResponse(error);
  }
}

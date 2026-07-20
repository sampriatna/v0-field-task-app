import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import {
  listStaffReportLinks,
  generateStaffReportLink,
  setStaffCache,
} from "@/lib/staff-report-store";
import type { Staff } from "@/lib/types";

async function requireAdmin() {
  const session = await getSession();
  if (!isAuthenticated(session)) return null;
  return session;
}

function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

function applyStaffFromBody(body: Record<string, unknown>) {
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
  if (staff.length > 0) setStaffCache(staff);
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    data: listStaffReportLinks(originFromRequest(request)),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    applyStaffFromBody(body);

    const staffId = String(body.staff_id || "");
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "staff_id wajib diisi" },
        { status: 400 }
      );
    }

    const result = generateStaffReportLink(staffId, originFromRequest(request));
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

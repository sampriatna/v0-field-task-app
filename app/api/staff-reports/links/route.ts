import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import {
  listStaffReportLinks,
  generateStaffReportLink,
  setStaffCache,
} from "@/lib/staff-report-store";
import { getStaff } from "@/lib/api-server-staff";

async function requireAdmin() {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return null;
  }
  return session;
}

function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Refresh staff cache from master when possible
  try {
    const staffResult = await getStaff();
    if (staffResult.success && staffResult.data) {
      setStaffCache(staffResult.data);
    }
  } catch {
    // keep existing cache
  }

  const origin = originFromRequest(request);
  return NextResponse.json({
    success: true,
    data: listStaffReportLinks(origin),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const staffId = String(body.staff_id || "");
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: "staff_id wajib diisi" },
        { status: 400 }
      );
    }

    try {
      const staffResult = await getStaff();
      if (staffResult.success && staffResult.data) {
        setStaffCache(staffResult.data);
      }
    } catch {
      // ignore
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

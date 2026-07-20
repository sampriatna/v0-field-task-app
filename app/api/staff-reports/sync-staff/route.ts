import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { setStaffCache } from "@/lib/staff-report-store";
import type { Staff } from "@/lib/types";

/**
 * Admin syncs staff list from client (sudah di-fetch) ke store lokal.
 * Menghindari menunggu GAS lagi di setiap request dashboard/link.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const raw = Array.isArray(body.staff) ? body.staff : [];
    const staff: Staff[] = raw
      .map((s: Record<string, unknown>) => ({
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
      .filter((s: Staff) => s.staff_id);

    if (staff.length > 0) {
      setStaffCache(staff);
    }

    return NextResponse.json({ success: true, data: { count: staff.length } });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { normalizeStaffPositionsInCache } from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { Staff } from "@/lib/types";

/**
 * Admin: samakan jabatan staff di cache dengan posisi kegiatan standar.
 * Body opsional: { staff: Staff[] } — sync dulu dari client (data GAS).
 * Persist ke GAS dilakukan di client via updateStaff per baris yang berubah.
 */
export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    let staff: Staff[] | undefined;
    try {
      const body = (await request.json()) as { staff?: Staff[] };
      staff = body.staff;
    } catch {
      staff = undefined;
    }

    const result = await normalizeStaffPositionsInCache(staff);
    return NextResponse.json({
      success: true,
      data: {
        total: result.total,
        updated: result.updated,
        unchanged: result.unchanged,
        unresolved: result.unresolved,
        updated_staff: result.updated_staff,
      },
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

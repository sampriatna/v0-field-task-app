import { NextResponse } from "next/server";
import { getLeaderStaffOptions } from "@/lib/leader-monitoring-store";
import { setStaffCache } from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { Staff } from "@/lib/types";

export async function GET(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const { searchParams } = new URL(request.url);
    const outlet = searchParams.get("outlet") || session.userOutlet || undefined;

    return NextResponse.json({
      success: true,
      data: await getLeaderStaffOptions(outlet),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

/** Optional: push staff list dari client agar picker lengkap */
export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const body = (await request.json()) as { staff?: Staff[]; outlet?: string };
    if (body.staff?.length) {
      await setStaffCache(body.staff);
    }
    const outlet = body.outlet || session.userOutlet || undefined;
    return NextResponse.json({
      success: true,
      data: await getLeaderStaffOptions(outlet),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

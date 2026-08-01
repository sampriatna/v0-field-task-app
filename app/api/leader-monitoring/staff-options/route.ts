import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { getLeaderStaffOptions } from "@/lib/leader-monitoring-store";
import { setStaffCache } from "@/lib/staff-report-store";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { Staff } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const outlet = searchParams.get("outlet") || session?.userOutlet || undefined;

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
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { staff?: Staff[]; outlet?: string };
    if (body.staff?.length) {
      await setStaffCache(body.staff);
    }
    const outlet = body.outlet || session?.userOutlet || undefined;
    return NextResponse.json({
      success: true,
      data: await getLeaderStaffOptions(outlet),
    });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canAccessDailyActivityAdmin,
  dailyActivityAdminDeniedResponse,
} from "@/lib/staff-report-auth";
import type { SessionPayload } from "@/lib/auth";

export async function requireDailyActivityAdmin(): Promise<
  SessionPayload | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  if (!canAccessDailyActivityAdmin(session)) {
    return NextResponse.json(dailyActivityAdminDeniedResponse(), { status: 403 });
  }
  return session;
}

export function isSessionPayload(
  value: SessionPayload | NextResponse
): value is SessionPayload {
  return !(value instanceof NextResponse);
}

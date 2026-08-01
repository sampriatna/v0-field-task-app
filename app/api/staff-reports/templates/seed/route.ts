import { NextResponse } from "next/server";
import { seedDailyActivityTemplates } from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";

/** Admin: upsert template kegiatan harian dari seed v2. */
export async function POST() {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const result = await seedDailyActivityTemplates();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

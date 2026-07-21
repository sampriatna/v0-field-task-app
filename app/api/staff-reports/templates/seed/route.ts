import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { seedDailyActivityTemplates } from "@/lib/staff-report-store";

/** Admin: upsert template kegiatan harian dari seed v2. */
export async function POST() {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = seedDailyActivityTemplates();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seed template gagal",
      },
      { status: 500 }
    );
  }
}

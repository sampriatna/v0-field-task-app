import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { listLeaderMonitorTemplates } from "@/lib/leader-monitoring-store";

export async function GET(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const outlet = searchParams.get("outlet") || undefined;

  return NextResponse.json({
    success: true,
    data: listLeaderMonitorTemplates(outlet),
  });
}

import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { submitLeaderMonitor } from "@/lib/leader-monitoring-store";
import type { SubmitLeaderMonitorPayload } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SubmitLeaderMonitorPayload;
    const payload: SubmitLeaderMonitorPayload = {
      ...body,
      leader_id: body.leader_id || session?.userId || "LEADER",
      leader_name: body.leader_name || session?.userName || "Leader",
      outlet_id: body.outlet_id || session?.userOutlet || body.outlet_id,
    };

    const result = submitLeaderMonitor(payload);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan checklist leader." },
      { status: 500 }
    );
  }
}

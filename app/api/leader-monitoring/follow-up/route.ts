import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { updateLeaderMonitorFollowUp } from "@/lib/leader-monitoring-store";
import type { LeaderFollowUpStatus } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id: string;
      follow_up_status: LeaderFollowUpStatus;
      problem_note?: string;
      fix_instruction?: string;
    };
    if (!body.id || !body.follow_up_status) {
      return NextResponse.json(
        { success: false, error: "id dan follow_up_status wajib." },
        { status: 400 }
      );
    }
    const result = updateLeaderMonitorFollowUp(body.id, body.follow_up_status, {
      problem_note: body.problem_note,
      fix_instruction: body.fix_instruction,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal update follow up." }, { status: 500 });
  }
}

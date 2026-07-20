import { NextResponse } from "next/server";
import { submitDailyReport } from "@/lib/staff-report-store";
import type { ReportConditionStatus } from "@/lib/types";

/**
 * Public submit — sat set. Tidak menunggu GAS.
 * staff_id selalu dari token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "");
    const reportTemplateId = String(body.report_template_id || "");
    const note = typeof body.note === "string" ? body.note : "";
    const photoBase64 =
      typeof body.photo_base64 === "string" ? body.photo_base64 : undefined;
    const statusCondition = body.status_condition as ReportConditionStatus;
    const checklistAnswers = Array.isArray(body.checklist_answers)
      ? body.checklist_answers.map(
          (a: { checklist_item_id?: string; checked?: boolean }) => ({
            checklist_item_id: String(a.checklist_item_id || ""),
            checked: Boolean(a.checked),
          })
        )
      : [];

    if (!token || !reportTemplateId) {
      return NextResponse.json(
        { success: false, error: "Token dan kegiatan wajib diisi" },
        { status: 400 }
      );
    }

    if (!statusCondition) {
      return NextResponse.json(
        { success: false, error: "Pilih status kondisi kegiatan" },
        { status: 400 }
      );
    }

    const result = submitDailyReport({
      token,
      report_template_id: reportTemplateId,
      status_condition: statusCondition,
      note,
      photo_url: photoBase64 || null,
      checklist_answers: checklistAnswers,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { submitDailyReport } from "@/lib/staff-report-store";
import { notifyLeadersOnKendala } from "@/lib/wa-notify-daily-report";
import type { ReportConditionStatus } from "@/lib/types";

/**
 * Public submit — sat set.
 * Jika status kendala → notifikasi Leader (GAS bila ada + wa.me fallback).
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

    const submission = result.data;
    let notify = null;

    if (statusCondition !== "aman") {
      notify = await notifyLeadersOnKendala({
        staff_name: submission.staff_name || "Staff",
        staff_id: submission.staff_id,
        outlet: submission.outlet || submission.outlet_id,
        position: submission.position || "",
        activity_title: submission.report_title || "Kegiatan",
        status_condition: statusCondition,
        note: submission.note || "",
        checklist_summary:
          submission.checklist_total != null
            ? `${submission.checklist_checked}/${submission.checklist_total}`
            : undefined,
        report_date: submission.report_date,
        submission_id: submission.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: submission,
      notify,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

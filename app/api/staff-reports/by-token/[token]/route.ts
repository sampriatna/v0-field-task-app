import { NextResponse } from "next/server";
import { getStaffReportByToken } from "@/lib/staff-report-store";

/**
 * Public — harus sat set. Jangan tunggu GAS/getStaff.
 * Staff identity diambil dari token → store cache.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const result = getStaffReportByToken(token);

  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      staff: result.data.staff,
      templates: result.data.templates,
      today_submissions: result.data.today_submissions.map((s) => ({
        id: s.id,
        report_template_id: s.report_template_id,
        report_title: s.report_title,
        submitted_at: s.submitted_at,
        status_condition: s.status_condition,
        note: s.note,
        photo_url: s.photo_url,
        checklist_answers: s.checklist_answers,
        checklist_total: s.checklist_total,
        checklist_checked: s.checklist_checked,
        checklist_percent: s.checklist_percent,
      })),
      link_active: result.data.link.is_active,
    },
  });
}

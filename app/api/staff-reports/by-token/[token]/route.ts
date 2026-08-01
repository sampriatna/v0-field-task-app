import { NextResponse } from "next/server";
import { getStaffReportByToken } from "@/lib/staff-report-store";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";

/**
 * Public — harus sat set. Jangan tunggu GAS/getStaff.
 * Staff identity diambil dari token → persistent store.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const result = await getStaffReportByToken(token);

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
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

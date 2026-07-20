import { NextResponse } from "next/server";
import { getStaffReportByToken, setStaffCache } from "@/lib/staff-report-store";
import { getStaff } from "@/lib/api-server-staff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    const staffResult = await getStaff();
    if (staffResult.success && staffResult.data) {
      setStaffCache(staffResult.data);
    }
  } catch {
    // use seed cache
  }

  const result = getStaffReportByToken(token);
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }

  // Never expose full token list or internal ids beyond what's needed
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
        status: s.status,
        note: s.note,
        photo_url: s.photo_url,
      })),
      link_active: result.data.link.is_active,
    },
  });
}

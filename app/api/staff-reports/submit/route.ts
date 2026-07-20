import { NextResponse } from "next/server";
import { submitDailyReport, setStaffCache } from "@/lib/staff-report-store";
import { getStaff } from "@/lib/api-server-staff";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "");
    const reportTemplateId = String(body.report_template_id || "");
    const note = typeof body.note === "string" ? body.note : "";
    const photoBase64 =
      typeof body.photo_base64 === "string" ? body.photo_base64 : undefined;

    if (!token || !reportTemplateId) {
      return NextResponse.json(
        { success: false, error: "Token dan jenis report wajib diisi" },
        { status: 400 }
      );
    }

    try {
      const staffResult = await getStaff();
      if (staffResult.success && staffResult.data) {
        setStaffCache(staffResult.data);
      }
    } catch {
      // seed
    }

    // Store photo as data URL for demo; production should upload to Drive/Storage
    const photoUrl = photoBase64 || null;

    const result = submitDailyReport({
      token,
      report_template_id: reportTemplateId,
      note,
      photo_url: photoUrl,
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

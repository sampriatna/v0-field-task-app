import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import {
  listReportTemplates,
  createReportTemplate,
} from "@/lib/staff-report-store";

export async function GET() {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: listReportTemplates() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json(
        { success: false, error: "Judul template wajib diisi" },
        { status: 400 }
      );
    }

    const template = createReportTemplate({
      title: String(body.title),
      description: body.description ? String(body.description) : "",
      outlet_id:
        body.outlet_id === undefined || body.outlet_id === "" || body.outlet_id === "ALL"
          ? null
          : String(body.outlet_id),
      position_group:
        body.position_group === undefined ||
        body.position_group === "" ||
        body.position_group === "ALL"
          ? null
          : String(body.position_group),
      requires_photo: Boolean(body.requires_photo),
      is_required_daily: Boolean(body.is_required_daily),
      active: body.active !== false,
      sort_order: Number(body.sort_order ?? 10),
    });

    return NextResponse.json({ success: true, data: template });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

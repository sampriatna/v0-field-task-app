import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { updateReportTemplate } from "@/lib/staff-report-store";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const result = updateReportTemplate({
      id,
      title: body.title,
      description: body.description,
      outlet_id:
        body.outlet_id === undefined
          ? undefined
          : body.outlet_id === "" || body.outlet_id === "ALL"
            ? null
            : String(body.outlet_id),
      position_group:
        body.position_group === undefined
          ? undefined
          : body.position_group === "" || body.position_group === "ALL"
            ? null
            : String(body.position_group),
      requires_photo: body.requires_photo,
      is_required_daily: body.is_required_daily,
      active: body.active,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

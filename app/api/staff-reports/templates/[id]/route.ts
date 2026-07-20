import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";
import { updateReportTemplate } from "@/lib/staff-report-store";
import type { ReportTemplateCategory, ReportTemplateKind } from "@/lib/types";

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

    const checklistItems = Array.isArray(body.checklist_items)
      ? body.checklist_items
          .map(
            (
              item: { item_text?: string; is_required?: boolean; sort_order?: number },
              index: number
            ) => ({
              item_text: String(item.item_text || "").trim(),
              is_required: item.is_required !== false,
              sort_order: item.sort_order ?? index + 1,
            })
          )
          .filter((i: { item_text: string }) => i.item_text)
      : undefined;

    const result = updateReportTemplate({
      id,
      title: body.title,
      category: body.category as ReportTemplateCategory | undefined,
      description: body.description,
      standard_result: body.standard_result,
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
      kind: body.kind as ReportTemplateKind | undefined,
      target_time_start:
        body.target_time_start === undefined
          ? undefined
          : body.target_time_start
            ? String(body.target_time_start)
            : null,
      target_time_end:
        body.target_time_end === undefined
          ? undefined
          : body.target_time_end
            ? String(body.target_time_end)
            : null,
      active: body.active,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
      checklist_items: checklistItems,
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

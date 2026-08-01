import { NextResponse } from "next/server";
import {
  listReportTemplates,
  createReportTemplate,
} from "@/lib/staff-report-store";
import {
  requireDailyActivityAdmin,
  isSessionPayload,
} from "@/lib/staff-report-api-auth";
import { dailyActivityStorageErrorResponse } from "@/lib/staff-report-api-utils";
import type { ReportTemplateCategory, ReportTemplateKind } from "@/lib/types";

export async function GET() {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    return NextResponse.json({ success: true, data: await listReportTemplates() });
  } catch (error) {
    return dailyActivityStorageErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const session = await requireDailyActivityAdmin();
  if (!isSessionPayload(session)) return session;

  try {
    const body = await request.json();
    if (!body.title || !String(body.title).trim()) {
      return NextResponse.json(
        { success: false, error: "Nama kegiatan wajib diisi" },
        { status: 400 }
      );
    }

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
      : [];

    const template = await createReportTemplate({
      title: String(body.title),
      category: (body.category as ReportTemplateCategory) || "General",
      description: body.description ? String(body.description) : "",
      standard_result: body.standard_result
        ? String(body.standard_result)
        : body.description
          ? String(body.description)
          : "",
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
      requires_note: Boolean(body.requires_note),
      is_required_daily: Boolean(body.is_required_daily),
      kind: (body.kind as ReportTemplateKind) || undefined,
      target_time_start: body.target_time_start ? String(body.target_time_start) : null,
      target_time_end: body.target_time_end ? String(body.target_time_end) : null,
      active: body.active !== false,
      sort_order: Number(body.sort_order ?? 10),
      checklist_items: checklistItems,
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
    return dailyActivityStorageErrorResponse(error);
  }
}

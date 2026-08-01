import type {
  LeaderMonitorTemplate,
  LeaderMonitorSubmission,
  LeaderMonitorChecklistItem,
  LeaderMonitorChecklistScore,
  LeaderMonitorFilters,
  LeaderFollowUpStatus,
} from "./types";
import {
  DailyActivityStorageError,
  isDailyActivityDbConfigured,
  getSupabaseClient,
} from "./daily-activity-db";

export { isDailyActivityDbConfigured as isLeaderMonitoringDbConfigured };
export { DailyActivityStorageError };

function assertReady(): void {
  if (!isDailyActivityDbConfigured()) {
    throw new DailyActivityStorageError(
      "Leader Monitoring storage belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
      "NOT_CONFIGURED"
    );
  }
}

function wrapError(context: string, error: { message: string }): never {
  throw new DailyActivityStorageError(`${context}: ${error.message}`, "QUERY_FAILED");
}

function mapTemplate(
  row: Record<string, unknown>,
  checklist: LeaderMonitorChecklistItem[]
): LeaderMonitorTemplate {
  return {
    id: String(row.id),
    kind: row.kind as LeaderMonitorTemplate["kind"],
    title: String(row.title),
    menu_label: String(row.menu_label),
    description: String(row.description || ""),
    standard_result: String(row.standard_result || ""),
    outlet_id: row.outlet_id ? String(row.outlet_id) : null,
    target_time_start: row.target_time_start ? String(row.target_time_start) : null,
    target_time_end: row.target_time_end ? String(row.target_time_end) : null,
    photo_mode: (row.photo_mode || "required") as LeaderMonitorTemplate["photo_mode"],
    active: Boolean(row.active),
    sort_order: Number(row.sort_order ?? 10),
    checklist,
  };
}

function mapChecklistItem(row: Record<string, unknown>): LeaderMonitorChecklistItem {
  return {
    id: String(row.id),
    item_text: String(row.item_text),
    sort_order: Number(row.sort_order ?? 1),
  };
}

function mapSubmission(row: Record<string, unknown>): LeaderMonitorSubmission {
  const scores = Array.isArray(row.checklist_scores)
    ? (row.checklist_scores as LeaderMonitorChecklistScore[])
    : [];
  const relatedIds = Array.isArray(row.related_staff_ids)
    ? (row.related_staff_ids as string[])
    : [];

  return {
    id: String(row.id),
    template_id: String(row.template_id),
    kind: row.kind as LeaderMonitorSubmission["kind"],
    report_date: String(row.report_date).slice(0, 10),
    outlet_id: String(row.outlet_id),
    shift: String(row.shift || "Siang"),
    leader_id: String(row.leader_id),
    leader_name: String(row.leader_name),
    area: String(row.area || ""),
    status: row.status as LeaderMonitorSubmission["status"],
    score_total: Number(row.score_total ?? 0),
    score_max: Number(row.score_max ?? 0),
    checklist_scores: scores,
    related_staff_ids: relatedIds,
    related_staff_names: String(row.related_staff_names || ""),
    problem_note: String(row.problem_note || ""),
    fix_instruction: String(row.fix_instruction || ""),
    fix_deadline: row.fix_deadline ? String(row.fix_deadline) : null,
    photo_url: row.photo_url ? String(row.photo_url) : null,
    follow_up_status: (row.follow_up_status || "open") as LeaderFollowUpStatus,
    staff_submission_id: row.staff_submission_id ? String(row.staff_submission_id) : null,
    staff_validation: row.staff_validation
      ? (row.staff_validation as LeaderMonitorSubmission["staff_validation"])
      : null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    title: row.title ? String(row.title) : undefined,
  };
}

function submissionToRow(sub: LeaderMonitorSubmission): Record<string, unknown> {
  return {
    id: sub.id,
    template_id: sub.template_id,
    kind: sub.kind,
    report_date: sub.report_date,
    outlet_id: sub.outlet_id,
    shift: sub.shift,
    leader_id: sub.leader_id,
    leader_name: sub.leader_name,
    area: sub.area,
    status: sub.status,
    score_total: sub.score_total,
    score_max: sub.score_max,
    checklist_scores: sub.checklist_scores,
    related_staff_ids: sub.related_staff_ids,
    related_staff_names: sub.related_staff_names,
    problem_note: sub.problem_note,
    fix_instruction: sub.fix_instruction,
    fix_deadline: sub.fix_deadline ?? null,
    photo_url: sub.photo_url ?? null,
    follow_up_status: sub.follow_up_status,
    staff_submission_id: sub.staff_submission_id ?? null,
    staff_validation: sub.staff_validation ?? null,
    title: sub.title ?? null,
    created_at: sub.created_at,
    updated_at: sub.updated_at,
  };
}

export async function lmListTemplates(): Promise<LeaderMonitorTemplate[]> {
  assertReady();
  const client = getSupabaseClient();
  const { data: templates, error } = await client
    .from("lm_templates")
    .select("*")
    .order("sort_order");
  if (error) wrapError("Gagal memuat template leader", error);

  const { data: items, error: itemsErr } = await client
    .from("lm_template_checklist_items")
    .select("*")
    .order("sort_order");
  if (itemsErr) wrapError("Gagal memuat checklist template leader", itemsErr);

  const itemsByTpl = new Map<string, LeaderMonitorChecklistItem[]>();
  for (const raw of items || []) {
    const row = raw as Record<string, unknown>;
    const tplId = String(row.template_id);
    const item = mapChecklistItem(row);
    const arr = itemsByTpl.get(tplId) ?? [];
    arr.push(item);
    itemsByTpl.set(tplId, arr);
  }

  return (templates || []).map((row) =>
    mapTemplate(row as Record<string, unknown>, itemsByTpl.get(String(row.id)) ?? [])
  );
}

export async function lmUpsertTemplate(template: LeaderMonitorTemplate): Promise<void> {
  assertReady();
  const client = getSupabaseClient();
  const { error } = await client.from("lm_templates").upsert(
    {
      id: template.id,
      kind: template.kind,
      title: template.title,
      menu_label: template.menu_label,
      description: template.description,
      standard_result: template.standard_result,
      outlet_id: template.outlet_id,
      target_time_start: template.target_time_start ?? null,
      target_time_end: template.target_time_end ?? null,
      photo_mode: template.photo_mode,
      active: template.active,
      sort_order: template.sort_order,
    },
    { onConflict: "id" }
  );
  if (error) wrapError("Gagal menyimpan template leader", error);

  await client
    .from("lm_template_checklist_items")
    .delete()
    .eq("template_id", template.id);

  if (template.checklist.length > 0) {
    const { error: insertErr } = await client.from("lm_template_checklist_items").insert(
      template.checklist.map((item) => ({
        id: item.id,
        template_id: template.id,
        item_text: item.item_text,
        sort_order: item.sort_order,
      }))
    );
    if (insertErr) wrapError("Gagal menyimpan checklist template leader", insertErr);
  }
}

export async function lmInsertSubmission(sub: LeaderMonitorSubmission): Promise<void> {
  assertReady();
  const { error } = await getSupabaseClient()
    .from("lm_submissions")
    .insert(submissionToRow(sub));
  if (error) wrapError("Gagal menyimpan submission leader", error);
}

export async function lmUpdateSubmission(sub: LeaderMonitorSubmission): Promise<void> {
  assertReady();
  const { error } = await getSupabaseClient()
    .from("lm_submissions")
    .update(submissionToRow(sub))
    .eq("id", sub.id);
  if (error) wrapError("Gagal memperbarui submission leader", error);
}

export async function lmGetSubmission(id: string): Promise<LeaderMonitorSubmission | null> {
  assertReady();
  const { data, error } = await getSupabaseClient()
    .from("lm_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) wrapError("Gagal memuat submission leader", error);
  return data ? mapSubmission(data as Record<string, unknown>) : null;
}

export async function lmListSubmissions(
  filters: LeaderMonitorFilters = {}
): Promise<LeaderMonitorSubmission[]> {
  assertReady();
  const date = filters.date || new Date().toISOString().slice(0, 10);
  let query = getSupabaseClient()
    .from("lm_submissions")
    .select("*")
    .eq("report_date", date);

  if (filters.outlet && filters.outlet !== "ALL") {
    query = query.eq("outlet_id", filters.outlet);
  }
  if (filters.kind && filters.kind !== "ALL") {
    query = query.eq("kind", filters.kind);
  }
  if (filters.follow_up && filters.follow_up !== "ALL") {
    query = query.eq("follow_up_status", filters.follow_up);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) wrapError("Gagal memuat daftar submission leader", error);
  return (data || []).map((row) => mapSubmission(row as Record<string, unknown>));
}

export async function lmCountTemplates(): Promise<number> {
  assertReady();
  const { count, error } = await getSupabaseClient()
    .from("lm_templates")
    .select("id", { count: "exact", head: true });
  if (error) wrapError("Gagal cek template leader", error);
  return count ?? 0;
}

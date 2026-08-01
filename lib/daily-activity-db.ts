import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Staff,
  StaffReportLink,
  ReportTemplate,
  ReportTemplateChecklistItem,
  DailyReportSubmission,
  DailyReportChecklistAnswer,
  ReportConditionStatus,
  StaffReportValidationStatus,
} from "./types";

export class DailyActivityStorageError extends Error {
  readonly code: "NOT_CONFIGURED" | "QUERY_FAILED";

  constructor(
    message: string,
    code: "NOT_CONFIGURED" | "QUERY_FAILED" = "QUERY_FAILED"
  ) {
    super(message);
    this.name = "DailyActivityStorageError";
    this.code = code;
  }
}

export function isDailyActivityDbConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function requireClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new DailyActivityStorageError(
      "Daily Activity storage belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment.",
      "NOT_CONFIGURED"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) client = requireClient();
  return client;
}

function getClient(): SupabaseClient {
  return getSupabaseClient();
}

function mapStaff(row: Record<string, unknown>): Staff {
  return {
    staff_id: String(row.staff_id),
    name: String(row.name),
    position: String(row.position || ""),
    outlet: row.outlet as Staff["outlet"],
    area: (row.area || "Dapur") as Staff["area"],
    wa_number: String(row.wa_number || ""),
    role: (row.role || "STAFF") as Staff["role"],
    status: row.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function mapLink(row: Record<string, unknown>): StaffReportLink {
  return {
    id: String(row.id),
    staff_id: String(row.staff_id),
    token: String(row.token),
    short_code: String(row.short_code || ""),
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at || ""),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
  };
}

function mapTemplate(row: Record<string, unknown>): ReportTemplate {
  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as ReportTemplate["category"],
    outlet_id: row.outlet_id ? String(row.outlet_id) : null,
    position_group: row.position_group ? String(row.position_group) : null,
    standard_result: String(row.standard_result || ""),
    description: String(row.description || ""),
    requires_photo: Boolean(row.requires_photo),
    requires_note: Boolean(row.requires_note),
    is_required_daily: Boolean(row.is_required_daily),
    kind: (row.kind || "daily_required") as ReportTemplate["kind"],
    target_time_start: row.target_time_start ? String(row.target_time_start) : null,
    target_time_end: row.target_time_end ? String(row.target_time_end) : null,
    active: Boolean(row.active),
    sort_order: Number(row.sort_order ?? 10),
    created_at: String(row.created_at || ""),
  };
}

function mapChecklistItem(row: Record<string, unknown>): ReportTemplateChecklistItem {
  return {
    id: String(row.id),
    report_template_id: String(row.report_template_id),
    item_text: String(row.item_text),
    is_required: Boolean(row.is_required),
    sort_order: Number(row.sort_order ?? 1),
    created_at: String(row.created_at || ""),
  };
}

function mapSubmission(row: Record<string, unknown>): DailyReportSubmission {
  return {
    id: String(row.id),
    staff_id: String(row.staff_id),
    outlet_id: String(row.outlet_id),
    report_template_id: String(row.report_template_id),
    report_date: String(row.report_date).slice(0, 10),
    status_condition: row.status_condition as ReportConditionStatus,
    note: String(row.note || ""),
    photo_url: row.photo_url ? String(row.photo_url) : null,
    submitted_at: String(row.submitted_at || ""),
    created_at: String(row.created_at || ""),
    leader_validation: row.leader_validation
      ? (row.leader_validation as StaffReportValidationStatus)
      : null,
    leader_validation_note: row.leader_validation_note
      ? String(row.leader_validation_note)
      : null,
    leader_validated_at: row.leader_validated_at
      ? String(row.leader_validated_at)
      : null,
    leader_validated_by: row.leader_validated_by
      ? String(row.leader_validated_by)
      : null,
    leader_validated_by_name: row.leader_validated_by_name
      ? String(row.leader_validated_by_name)
      : null,
    leader_validation_photo_url: row.leader_validation_photo_url
      ? String(row.leader_validation_photo_url)
      : null,
  };
}

function mapAnswer(row: Record<string, unknown>): DailyReportChecklistAnswer {
  return {
    id: String(row.id),
    submission_id: String(row.submission_id),
    checklist_item_id: String(row.checklist_item_id),
    checked: Boolean(row.checked),
    created_at: String(row.created_at || ""),
  };
}

function wrapError(context: string, error: { message: string }): never {
  throw new DailyActivityStorageError(`${context}: ${error.message}`, "QUERY_FAILED");
}

export async function dbUpsertStaff(staffList: Staff[]): Promise<void> {
  if (staffList.length === 0) return;
  const rows = staffList.map((s) => ({
    staff_id: s.staff_id,
    name: s.name,
    position: s.position || "",
    outlet: s.outlet,
    area: s.area || "Dapur",
    wa_number: s.wa_number || "",
    role: s.role || "STAFF",
    status: s.status || "ACTIVE",
    created_at: s.created_at || new Date().toISOString(),
    updated_at: s.updated_at || new Date().toISOString(),
  }));
  const { error } = await getClient()
    .from("da_staff_cache")
    .upsert(rows, { onConflict: "staff_id" });
  if (error) wrapError("Gagal menyimpan staff cache", error);
}

export async function dbGetStaff(): Promise<Staff[]> {
  const { data, error } = await getClient()
    .from("da_staff_cache")
    .select("*")
    .order("name");
  if (error) wrapError("Gagal memuat staff cache", error);
  return (data || []).map((row) => mapStaff(row as Record<string, unknown>));
}

export async function dbGetStaffById(staffId: string): Promise<Staff | null> {
  const { data, error } = await getClient()
    .from("da_staff_cache")
    .select("*")
    .eq("staff_id", staffId)
    .maybeSingle();
  if (error) wrapError("Gagal memuat staff", error);
  return data ? mapStaff(data as Record<string, unknown>) : null;
}

export async function dbListLinks(): Promise<StaffReportLink[]> {
  const { data, error } = await getClient()
    .from("da_report_links")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) wrapError("Gagal memuat link staff", error);
  return (data || []).map((row) => mapLink(row as Record<string, unknown>));
}

export async function dbGetLinkByToken(tokenOrCode: string): Promise<StaffReportLink | null> {
  const key = tokenOrCode.trim();
  if (!key) return null;
  const keyLower = key.toLowerCase();

  const { data: byToken, error: err1 } = await getClient()
    .from("da_report_links")
    .select("*")
    .eq("token", key)
    .maybeSingle();
  if (err1) wrapError("Gagal mencari link", err1);
  if (byToken) return mapLink(byToken as Record<string, unknown>);

  const { data: byCode, error: err2 } = await getClient()
    .from("da_report_links")
    .select("*")
    .ilike("short_code", keyLower)
    .maybeSingle();
  if (err2) wrapError("Gagal mencari link", err2);
  return byCode ? mapLink(byCode as Record<string, unknown>) : null;
}

export async function dbInsertLink(link: StaffReportLink): Promise<void> {
  const { error } = await getClient().from("da_report_links").insert({
    id: link.id,
    staff_id: link.staff_id,
    token: link.token,
    short_code: link.short_code,
    is_active: link.is_active,
    created_at: link.created_at,
    revoked_at: link.revoked_at ?? null,
  });
  if (error) wrapError("Gagal membuat link", error);
}

export async function dbUpdateLink(link: StaffReportLink): Promise<void> {
  const { error } = await getClient()
    .from("da_report_links")
    .update({
      short_code: link.short_code,
      is_active: link.is_active,
      revoked_at: link.revoked_at ?? null,
    })
    .eq("id", link.id);
  if (error) wrapError("Gagal memperbarui link", error);
}

export async function dbRevokeActiveLinksForStaff(
  staffId: string,
  revokedAt: string
): Promise<void> {
  const { error } = await getClient()
    .from("da_report_links")
    .update({ is_active: false, revoked_at: revokedAt })
    .eq("staff_id", staffId)
    .eq("is_active", true);
  if (error) wrapError("Gagal menonaktifkan link lama", error);
}

export async function dbListTemplates(): Promise<ReportTemplate[]> {
  const { data, error } = await getClient()
    .from("da_report_templates")
    .select("*")
    .order("sort_order");
  if (error) wrapError("Gagal memuat template", error);
  return (data || []).map((row) => mapTemplate(row as Record<string, unknown>));
}

export async function dbUpsertTemplate(template: ReportTemplate): Promise<void> {
  const { error } = await getClient().from("da_report_templates").upsert(
    {
      id: template.id,
      title: template.title,
      category: template.category,
      outlet_id: template.outlet_id,
      position_group: template.position_group,
      standard_result: template.standard_result,
      description: template.description,
      requires_photo: template.requires_photo,
      requires_note: Boolean(template.requires_note),
      is_required_daily: template.is_required_daily,
      kind: template.kind,
      target_time_start: template.target_time_start ?? null,
      target_time_end: template.target_time_end ?? null,
      active: template.active,
      sort_order: template.sort_order,
      created_at: template.created_at,
    },
    { onConflict: "id" }
  );
  if (error) wrapError("Gagal menyimpan template", error);
}

export async function dbDeleteChecklistItemsForTemplate(templateId: string): Promise<void> {
  const { error } = await getClient()
    .from("da_report_template_checklist_items")
    .delete()
    .eq("report_template_id", templateId);
  if (error) wrapError("Gagal menghapus checklist template", error);
}

export async function dbInsertChecklistItems(
  items: ReportTemplateChecklistItem[]
): Promise<void> {
  if (items.length === 0) return;
  const { error } = await getClient().from("da_report_template_checklist_items").insert(
    items.map((i) => ({
      id: i.id,
      report_template_id: i.report_template_id,
      item_text: i.item_text,
      is_required: i.is_required,
      sort_order: i.sort_order,
      created_at: i.created_at,
    }))
  );
  if (error) wrapError("Gagal menyimpan checklist template", error);
}

export async function dbListChecklistItems(
  templateId?: string
): Promise<ReportTemplateChecklistItem[]> {
  let query = getClient()
    .from("da_report_template_checklist_items")
    .select("*")
    .order("sort_order");
  if (templateId) query = query.eq("report_template_id", templateId);
  const { data, error } = await query;
  if (error) wrapError("Gagal memuat checklist items", error);
  return (data || []).map((row) => mapChecklistItem(row as Record<string, unknown>));
}

export async function dbListSubmissionsByDate(
  reportDate: string
): Promise<DailyReportSubmission[]> {
  const { data, error } = await getClient()
    .from("da_report_submissions")
    .select("*")
    .eq("report_date", reportDate);
  if (error) wrapError("Gagal memuat submission", error);
  return (data || []).map((row) => mapSubmission(row as Record<string, unknown>));
}

export async function dbListSubmissionsForStaffOnDate(
  staffId: string,
  reportDate: string
): Promise<DailyReportSubmission[]> {
  const { data, error } = await getClient()
    .from("da_report_submissions")
    .select("*")
    .eq("staff_id", staffId)
    .eq("report_date", reportDate);
  if (error) wrapError("Gagal memuat submission staff", error);
  return (data || []).map((row) => mapSubmission(row as Record<string, unknown>));
}

export async function dbGetSubmission(id: string): Promise<DailyReportSubmission | null> {
  const { data, error } = await getClient()
    .from("da_report_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) wrapError("Gagal memuat submission", error);
  return data ? mapSubmission(data as Record<string, unknown>) : null;
}

export async function dbFindSubmission(
  staffId: string,
  templateId: string,
  reportDate: string
): Promise<DailyReportSubmission | null> {
  const { data, error } = await getClient()
    .from("da_report_submissions")
    .select("*")
    .eq("staff_id", staffId)
    .eq("report_template_id", templateId)
    .eq("report_date", reportDate)
    .maybeSingle();
  if (error) wrapError("Gagal mencari submission", error);
  return data ? mapSubmission(data as Record<string, unknown>) : null;
}

export async function dbUpsertSubmission(sub: DailyReportSubmission): Promise<void> {
  const { error } = await getClient().from("da_report_submissions").upsert(
    {
      id: sub.id,
      staff_id: sub.staff_id,
      outlet_id: sub.outlet_id,
      report_template_id: sub.report_template_id,
      report_date: sub.report_date,
      status_condition: sub.status_condition,
      note: sub.note || "",
      photo_url: sub.photo_url ?? null,
      submitted_at: sub.submitted_at,
      created_at: sub.created_at,
      leader_validation: sub.leader_validation ?? null,
      leader_validation_note: sub.leader_validation_note ?? null,
      leader_validated_at: sub.leader_validated_at ?? null,
      leader_validated_by: sub.leader_validated_by ?? null,
      leader_validated_by_name: sub.leader_validated_by_name ?? null,
      leader_validation_photo_url: sub.leader_validation_photo_url ?? null,
    },
    { onConflict: "staff_id,report_template_id,report_date" }
  );
  if (error) wrapError("Gagal menyimpan submission", error);
}

export async function dbUpdateSubmissionValidation(
  id: string,
  fields: Partial<DailyReportSubmission>
): Promise<void> {
  const { error } = await getClient()
    .from("da_report_submissions")
    .update({
      leader_validation: fields.leader_validation ?? null,
      leader_validation_note: fields.leader_validation_note ?? null,
      leader_validated_at: fields.leader_validated_at ?? null,
      leader_validated_by: fields.leader_validated_by ?? null,
      leader_validated_by_name: fields.leader_validated_by_name ?? null,
      leader_validation_photo_url: fields.leader_validation_photo_url ?? null,
    })
    .eq("id", id);
  if (error) wrapError("Gagal memperbarui validasi leader", error);
}

export async function dbDeleteAnswersForSubmission(submissionId: string): Promise<void> {
  const { error } = await getClient()
    .from("da_report_checklist_answers")
    .delete()
    .eq("submission_id", submissionId);
  if (error) wrapError("Gagal menghapus jawaban checklist", error);
}

export async function dbInsertAnswers(answers: DailyReportChecklistAnswer[]): Promise<void> {
  if (answers.length === 0) return;
  const { error } = await getClient().from("da_report_checklist_answers").insert(
    answers.map((a) => ({
      id: a.id,
      submission_id: a.submission_id,
      checklist_item_id: a.checklist_item_id,
      checked: a.checked,
      created_at: a.created_at,
    }))
  );
  if (error) wrapError("Gagal menyimpan jawaban checklist", error);
}

export async function dbListAnswersForSubmissions(
  submissionIds: string[]
): Promise<DailyReportChecklistAnswer[]> {
  if (submissionIds.length === 0) return [];
  const { data, error } = await getClient()
    .from("da_report_checklist_answers")
    .select("*")
    .in("submission_id", submissionIds);
  if (error) wrapError("Gagal memuat jawaban checklist", error);
  return (data || []).map((row) => mapAnswer(row as Record<string, unknown>));
}

export async function dbListSubmissionsNeedingFix(
  reportDate: string
): Promise<DailyReportSubmission[]> {
  const { data, error } = await getClient()
    .from("da_report_submissions")
    .select("*")
    .eq("report_date", reportDate)
    .in("leader_validation", ["revisi", "tidak_valid", "manipulasi"]);
  if (error) wrapError("Gagal memuat submission perlu perbaikan", error);
  return (data || []).map((row) => mapSubmission(row as Record<string, unknown>));
}

export async function dbCountActiveLinksWithShortCode(
  shortCode: string,
  excludeLinkId?: string
): Promise<number> {
  let query = getClient()
    .from("da_report_links")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .ilike("short_code", shortCode);
  if (excludeLinkId) query = query.neq("id", excludeLinkId);
  const { count, error } = await query;
  if (error) wrapError("Gagal cek short_code", error);
  return count ?? 0;
}

export { DailyActivityStorageError as StorageError };

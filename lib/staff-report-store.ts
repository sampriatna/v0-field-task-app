import { randomBytes } from "crypto";
import type {
  Staff,
  StaffReportLink,
  ReportTemplate,
  ReportTemplateChecklistItem,
  DailyReportSubmission,
  DailyReportChecklistAnswer,
  CreateReportTemplatePayload,
  UpdateReportTemplatePayload,
  DailyReportFilters,
  DailyReportDashboardData,
  DailyReportDashboardRow,
  DailyReportDashboardSummary,
  DailyReportRowLabel,
  StaffReportLinkContext,
  ReportConditionStatus,
  ReportTemplateCategory,
  ReportTemplateKind,
} from "./types";
import {
  normalizePositionGroup,
  resolveStaffPositionGroup,
} from "./position-groups";
import {
  DAILY_ACTIVITY_SEED_TEMPLATES,
  type DailyActivitySeedDef,
} from "./daily-activity-seed-data";
import {
  isDailyActivityDbConfigured,
  DailyActivityStorageError,
  dbUpsertStaff,
  dbGetStaff,
  dbGetStaffById,
  dbListLinks,
  dbGetLinkByToken,
  dbInsertLink,
  dbUpdateLink,
  dbRevokeActiveLinksForStaff,
  dbListTemplates,
  dbUpsertTemplate,
  dbDeleteChecklistItemsForTemplate,
  dbInsertChecklistItems,
  dbListChecklistItems,
  dbListSubmissionsByDate,
  dbListSubmissionsForStaffOnDate,
  dbGetSubmission,
  dbFindSubmission,
  dbUpsertSubmission,
  dbUpdateSubmissionValidation,
  dbDeleteAnswersForSubmission,
  dbInsertAnswers,
  dbListAnswersForSubmissions,
  dbListSubmissionsNeedingFix,
  dbCountActiveLinksWithShortCode,
} from "./daily-activity-db";

export { normalizePositionGroup } from "./position-groups";
export { isDailyActivityDbConfigured, DailyActivityStorageError };

function assertStorageReady(): void {
  if (!isDailyActivityDbConfigured()) {
    throw new DailyActivityStorageError(
      "Daily Activity storage belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
      "NOT_CONFIGURED"
    );
  }
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

export function generateReportToken(): string {
  return randomBytes(32).toString("hex");
}

export function slugifyStaffName(name: string): string {
  const raw = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 48)
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return raw || "staff";
}

function matchesPositionGroup(
  templateGroup: string | null,
  staffPosition: string
): boolean {
  if (!templateGroup) return true;
  const staffGroup = normalizePositionGroup(staffPosition);
  const tplGroup = normalizePositionGroup(templateGroup);
  if (
    staffGroup &&
    tplGroup &&
    staffGroup.toLowerCase() === tplGroup.toLowerCase()
  ) {
    return true;
  }
  return (
    staffPosition.trim().toLowerCase() === templateGroup.trim().toLowerCase()
  );
}

type SeedDef = {
  id: string;
  title: string;
  category: ReportTemplateCategory;
  position_group: string | null;
  outlet_id?: string | null;
  standard_result: string;
  requires_photo: boolean;
  requires_note?: boolean;
  is_required_daily: boolean;
  kind?: ReportTemplateKind;
  target_time_start?: string;
  target_time_end?: string;
  sort_order: number;
  checklist: string[];
};

function seedDefFromV2(def: DailyActivitySeedDef): SeedDef {
  return {
    id: def.code,
    title: def.title,
    category: def.category as ReportTemplateCategory,
    position_group: def.position_group,
    outlet_id: def.outlet_code ?? null,
    standard_result: def.standard_result,
    requires_photo: def.requires_photo,
    requires_note: Boolean(def.requires_note),
    is_required_daily: def.is_required_daily,
    kind: def.kind,
    target_time_start: def.target_time_start,
    target_time_end: def.target_time_end,
    sort_order: def.sort_order,
    checklist: def.checklist,
  };
}

function buildSeed(defs: SeedDef[]): {
  templates: ReportTemplate[];
  items: ReportTemplateChecklistItem[];
} {
  const templates: ReportTemplate[] = [];
  const items: ReportTemplateChecklistItem[] = [];
  const created = nowISO();

  for (const d of defs) {
    templates.push({
      id: d.id,
      title: d.title,
      category: d.category,
      outlet_id: d.outlet_id ?? null,
      position_group: d.position_group || null,
      standard_result: d.standard_result,
      description: d.standard_result,
      requires_photo: d.requires_photo,
      requires_note: Boolean(d.requires_note),
      is_required_daily: d.is_required_daily,
      kind: d.kind ?? (d.is_required_daily ? "daily_required" : "special_task"),
      target_time_start: d.target_time_start ?? null,
      target_time_end: d.target_time_end ?? null,
      active: true,
      sort_order: d.sort_order,
      created_at: created,
    });
    d.checklist.forEach((text, i) => {
      items.push({
        id: `${d.id}-CI-${String(i + 1).padStart(2, "0")}`,
        report_template_id: d.id,
        item_text: text,
        is_required: true,
        sort_order: i + 1,
        created_at: created,
      });
    });
  }
  return { templates, items };
}

export async function setStaffCache(staff: Staff[]): Promise<void> {
  assertStorageReady();
  if (staff.length > 0) await dbUpsertStaff(staff);
}

export async function getStaffCache(): Promise<Staff[]> {
  assertStorageReady();
  return dbGetStaff();
}

async function findStaff(staffId: string): Promise<Staff | undefined> {
  const staff = await dbGetStaffById(staffId);
  return staff ?? undefined;
}

export async function getChecklistItemsForTemplate(
  templateId: string
): Promise<ReportTemplateChecklistItem[]> {
  assertStorageReady();
  return dbListChecklistItems(templateId);
}

export async function enrichTemplate(template: ReportTemplate): Promise<ReportTemplate> {
  return {
    ...template,
    checklist_items: await getChecklistItemsForTemplate(template.id),
  };
}

export async function matchTemplatesForStaff(
  outlet: string,
  position: string,
  templates?: ReportTemplate[]
): Promise<ReportTemplate[]> {
  assertStorageReady();
  const list = (templates ?? (await dbListTemplates())).filter((t) => t.active);
  const matched = list
    .filter((t) => {
      const outletOk = !t.outlet_id || t.outlet_id === outlet;
      const positionOk = matchesPositionGroup(t.position_group, position);
      return outletOk && positionOk;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  return Promise.all(matched.map(enrichTemplate));
}

async function ensureUniqueShortCode(
  base: string,
  excludeLinkId?: string
): Promise<string> {
  let code = base || "staff";
  let n = 0;
  while ((await dbCountActiveLinksWithShortCode(code, excludeLinkId)) > 0) {
    n += 1;
    code = `${base}${n}`;
  }
  return code;
}

async function ensureLinkShortCode(link: StaffReportLink): Promise<StaffReportLink> {
  if (link.short_code) return link;
  const staff = await findStaff(link.staff_id);
  const base = slugifyStaffName(staff?.name || link.staff_id);
  link.short_code = await ensureUniqueShortCode(base, link.id);
  await dbUpdateLink(link);
  return link;
}

async function enrichLink(link: StaffReportLink, origin?: string): Promise<StaffReportLink> {
  const withCode = await ensureLinkShortCode(link);
  const staff = await findStaff(withCode.staff_id);
  const base = origin || "";
  return {
    ...withCode,
    staff_name: staff?.name,
    outlet: staff?.outlet,
    position: staff?.position,
    report_url: `${base}/r/${withCode.short_code}`,
    report_url_long: `${base}/r/${withCode.token}`,
  };
}

export async function listStaffReportLinks(origin?: string): Promise<StaffReportLink[]> {
  assertStorageReady();
  const links = await dbListLinks();
  return Promise.all(links.map((l) => enrichLink(l, origin)));
}

export async function getLinkByToken(tokenOrCode: string): Promise<StaffReportLink | undefined> {
  assertStorageReady();
  const link = await dbGetLinkByToken(tokenOrCode);
  if (!link) return undefined;
  return ensureLinkShortCode(link);
}

export async function generateStaffReportLink(
  staffId: string,
  origin?: string
): Promise<{ success: true; data: StaffReportLink } | { success: false; error: string }> {
  assertStorageReady();
  const staff = await findStaff(staffId);
  if (!staff) return { success: false, error: "Staff tidak ditemukan" };
  if (staff.status !== "ACTIVE") return { success: false, error: "Staff tidak aktif" };

  await dbRevokeActiveLinksForStaff(staffId, nowISO());

  const short_code = await ensureUniqueShortCode(slugifyStaffName(staff.name));
  const newLink: StaffReportLink = {
    id: uid("SRL"),
    staff_id: staffId,
    token: generateReportToken(),
    short_code,
    is_active: true,
    created_at: nowISO(),
    revoked_at: null,
  };
  await dbInsertLink(newLink);
  return { success: true, data: await enrichLink(newLink, origin) };
}

export async function revokeStaffReportLink(
  linkId: string
): Promise<{ success: true; data: StaffReportLink } | { success: false; error: string }> {
  assertStorageReady();
  const links = await dbListLinks();
  const link = links.find((l) => l.id === linkId);
  if (!link) return { success: false, error: "Link tidak ditemukan" };
  link.is_active = false;
  link.revoked_at = nowISO();
  await dbUpdateLink(link);
  return { success: true, data: await enrichLink(link) };
}

async function replaceChecklistItems(
  templateId: string,
  items: { item_text: string; is_required?: boolean; sort_order?: number }[]
): Promise<void> {
  await dbDeleteChecklistItemsForTemplate(templateId);
  const created = nowISO();
  const toInsert: ReportTemplateChecklistItem[] = [];
  items.forEach((item, index) => {
    const text = item.item_text.trim();
    if (!text) return;
    toInsert.push({
      id: uid("RTCI"),
      report_template_id: templateId,
      item_text: text,
      is_required: item.is_required !== false,
      sort_order: item.sort_order ?? index + 1,
      created_at: created,
    });
  });
  await dbInsertChecklistItems(toInsert);
}

export async function listReportTemplates(): Promise<ReportTemplate[]> {
  assertStorageReady();
  const templates = await dbListTemplates();
  return Promise.all(
    [...templates].sort((a, b) => a.sort_order - b.sort_order).map(enrichTemplate)
  );
}

export async function createReportTemplate(
  payload: CreateReportTemplatePayload
): Promise<ReportTemplate> {
  assertStorageReady();
  const template: ReportTemplate = {
    id: uid("RTPL"),
    title: payload.title.trim(),
    category: payload.category || "General",
    outlet_id: payload.outlet_id ?? null,
    position_group: payload.position_group ?? null,
    standard_result: (payload.standard_result || payload.description || "").trim(),
    description: (payload.description || payload.standard_result || "").trim(),
    requires_photo: Boolean(payload.requires_photo),
    requires_note: Boolean(payload.requires_note),
    is_required_daily: Boolean(payload.is_required_daily),
    kind:
      payload.kind ||
      (payload.is_required_daily ? "daily_required" : "special_task"),
    target_time_start: payload.target_time_start ?? null,
    target_time_end: payload.target_time_end ?? null,
    active: payload.active !== false,
    sort_order: payload.sort_order ?? 10,
    created_at: nowISO(),
  };
  await dbUpsertTemplate(template);
  if (payload.checklist_items?.length) {
    await replaceChecklistItems(template.id, payload.checklist_items);
  }
  return enrichTemplate(template);
}

export async function updateReportTemplate(
  payload: UpdateReportTemplatePayload
): Promise<{ success: true; data: ReportTemplate } | { success: false; error: string }> {
  assertStorageReady();
  const templates = await dbListTemplates();
  const template = templates.find((t) => t.id === payload.id);
  if (!template) return { success: false, error: "Template tidak ditemukan" };

  if (payload.title !== undefined) template.title = payload.title.trim();
  if (payload.category !== undefined) template.category = payload.category;
  if (payload.description !== undefined) template.description = payload.description.trim();
  if (payload.standard_result !== undefined)
    template.standard_result = payload.standard_result.trim();
  if (payload.outlet_id !== undefined) template.outlet_id = payload.outlet_id;
  if (payload.position_group !== undefined)
    template.position_group = payload.position_group;
  if (payload.requires_photo !== undefined)
    template.requires_photo = payload.requires_photo;
  if (payload.requires_note !== undefined)
    template.requires_note = payload.requires_note;
  if (payload.is_required_daily !== undefined)
    template.is_required_daily = payload.is_required_daily;
  if (payload.kind !== undefined) template.kind = payload.kind;
  if (payload.target_time_start !== undefined)
    template.target_time_start = payload.target_time_start;
  if (payload.target_time_end !== undefined)
    template.target_time_end = payload.target_time_end;
  if (payload.active !== undefined) template.active = payload.active;
  if (payload.sort_order !== undefined) template.sort_order = payload.sort_order;
  if (payload.checklist_items !== undefined) {
    await replaceChecklistItems(template.id, payload.checklist_items);
  }

  await dbUpsertTemplate(template);
  return { success: true, data: await enrichTemplate(template) };
}

async function enrichSubmission(
  sub: DailyReportSubmission,
  checklistItems: ReportTemplateChecklistItem[],
  answers: DailyReportChecklistAnswer[],
  staff?: Staff,
  template?: ReportTemplate
): Promise<DailyReportSubmission> {
  const itemMap = new Map(checklistItems.map((i) => [i.id, i.item_text]));
  const enrichedAnswers = answers
    .filter((a) => a.submission_id === sub.id)
    .map((a) => ({
      ...a,
      item_text: itemMap.get(a.checklist_item_id),
    }));
  const total = enrichedAnswers.length;
  const checked = enrichedAnswers.filter((a) => a.checked).length;
  return {
    ...sub,
    checklist_answers: enrichedAnswers,
    checklist_total: total,
    checklist_checked: checked,
    checklist_percent: total > 0 ? Math.round((checked / total) * 100) : 0,
    staff_name: sub.staff_name || staff?.name,
    outlet: sub.outlet || staff?.outlet || sub.outlet_id,
    report_title: sub.report_title || template?.title,
    position: sub.position || staff?.position,
  };
}

export async function getStaffReportByToken(
  token: string
): Promise<{ success: true; data: StaffReportLinkContext } | { success: false; error: string }> {
  assertStorageReady();
  if (!token || token.trim().length < 2) {
    return { success: false, error: "Token tidak valid" };
  }

  const link = await getLinkByToken(token.trim());
  if (!link) {
    return { success: false, error: "Link tidak ditemukan. Hubungi atasan Anda." };
  }
  if (!link.is_active) {
    return {
      success: false,
      error: "Link sudah dinonaktifkan. Minta link baru ke atasan Anda.",
    };
  }

  const staff = await findStaff(link.staff_id);
  if (!staff || staff.status !== "ACTIVE") {
    return { success: false, error: "Staff tidak aktif. Hubungi atasan Anda." };
  }

  const templates = await matchTemplatesForStaff(staff.outlet, staff.position);
  const today = todayISO();
  const rawSubs = await dbListSubmissionsForStaffOnDate(staff.staff_id, today);
  const allItems = await dbListChecklistItems();
  const allTemplates = await dbListTemplates();
  const answers = await dbListAnswersForSubmissions(rawSubs.map((s) => s.id));

  const today_submissions = await Promise.all(
    rawSubs.map((s) =>
      enrichSubmission(
        s,
        allItems.filter((i) => i.report_template_id === s.report_template_id),
        answers,
        staff,
        allTemplates.find((t) => t.id === s.report_template_id)
      )
    )
  );

  return {
    success: true,
    data: {
      link: {
        ...link,
        staff_name: staff.name,
        outlet: staff.outlet,
        position: staff.position,
      },
      staff: {
        staff_id: staff.staff_id,
        name: staff.name,
        outlet: staff.outlet,
        position: staff.position,
        position_group: normalizePositionGroup(staff.position),
      },
      templates,
      today_submissions,
    },
  };
}

function isIssueCondition(c: ReportConditionStatus): boolean {
  return c !== "aman";
}

export async function submitDailyReport(input: {
  token: string;
  report_template_id: string;
  status_condition: ReportConditionStatus;
  note?: string;
  photo_url?: string | null;
  checklist_answers: { checklist_item_id: string; checked: boolean }[];
}): Promise<{ success: true; data: DailyReportSubmission } | { success: false; error: string }> {
  assertStorageReady();
  const ctx = await getStaffReportByToken(input.token);
  if (!ctx.success) return ctx;

  const { staff: staffCtx, templates } = ctx.data;
  const staff = await findStaff(staffCtx.staff_id);
  if (!staff) {
    return { success: false, error: "Staff tidak aktif. Hubungi atasan Anda." };
  }
  const template = templates.find((t) => t.id === input.report_template_id);
  if (!template) {
    return { success: false, error: "Kegiatan tidak tersedia untuk staff ini." };
  }

  const items = template.checklist_items || (await getChecklistItemsForTemplate(template.id));
  const answerMap = new Map(
    (input.checklist_answers || []).map((a) => [a.checklist_item_id, Boolean(a.checked)])
  );

  for (const a of input.checklist_answers || []) {
    if (!items.some((i) => i.id === a.checklist_item_id)) {
      return { success: false, error: "Checklist tidak valid untuk kegiatan ini." };
    }
  }

  if (items.length > 0 && (input.checklist_answers || []).length === 0) {
    return { success: false, error: "Centang checklist kegiatan terlebih dahulu." };
  }

  if (template.requires_photo && !input.photo_url) {
    const today = todayISO();
    const existing = await dbFindSubmission(staff.staff_id, template.id, today);
    if (!existing?.photo_url) {
      return { success: false, error: "Foto wajib untuk kegiatan ini." };
    }
  }

  const validConditions: ReportConditionStatus[] = [
    "aman",
    "kendala_ringan",
    "follow_up_leader",
    "perlu_belanja",
  ];
  if (!validConditions.includes(input.status_condition)) {
    return { success: false, error: "Pilih status kondisi kegiatan." };
  }

  const note = (input.note || "").trim();
  if (template.requires_note && !note) {
    return { success: false, error: "Catatan wajib diisi untuk kegiatan ini." };
  }
  if (isIssueCondition(input.status_condition) && !note) {
    return {
      success: false,
      error: "Catatan kendala wajib diisi jika status bukan Aman.",
    };
  }

  const today = todayISO();
  const submittedAt = nowISO();
  const existing = await dbFindSubmission(staff.staff_id, template.id, today);

  let submission: DailyReportSubmission;

  if (existing) {
    existing.status_condition = input.status_condition;
    existing.note = note;
    existing.photo_url = input.photo_url ?? existing.photo_url;
    existing.submitted_at = submittedAt;
    existing.staff_name = staff.name;
    existing.outlet = staff.outlet;
    existing.report_title = template.title;
    existing.position = staff.position;
    existing.leader_validation = null;
    existing.leader_validation_note = null;
    existing.leader_validated_at = null;
    existing.leader_validated_by = null;
    existing.leader_validated_by_name = null;
    existing.leader_validation_photo_url = null;
    submission = existing;
    await dbDeleteAnswersForSubmission(existing.id);
  } else {
    submission = {
      id: uid("DRS"),
      staff_id: staff.staff_id,
      outlet_id: staff.outlet,
      report_template_id: template.id,
      report_date: today,
      status_condition: input.status_condition,
      note,
      photo_url: input.photo_url ?? null,
      submitted_at: submittedAt,
      created_at: submittedAt,
      staff_name: staff.name,
      outlet: staff.outlet,
      report_title: template.title,
      position: staff.position,
    };
  }

  await dbUpsertSubmission(submission);

  const answers: DailyReportChecklistAnswer[] = items.map((item) => ({
    id: uid("DRCA"),
    submission_id: submission.id,
    checklist_item_id: item.id,
    checked: Boolean(answerMap.get(item.id)),
    created_at: submittedAt,
  }));
  await dbInsertAnswers(answers);

  return {
    success: true,
    data: await enrichSubmission(submission, items, answers, staff, template),
  };
}

function rowLabel(
  submitted: boolean,
  isRequired: boolean,
  condition?: ReportConditionStatus | null,
  leaderValidation?: string | null
): DailyReportRowLabel {
  if (!isRequired && !submitted) return "tidak_wajib";
  if (!submitted) return "belum_submit";
  if (
    leaderValidation === "revisi" ||
    leaderValidation === "tidak_valid" ||
    leaderValidation === "manipulasi"
  ) {
    return "perlu_perbaikan";
  }
  if (condition && isIssueCondition(condition)) return "selesai_kendala";
  return "selesai_lengkap";
}

export async function buildDailyReportDashboard(
  filters: DailyReportFilters = {}
): Promise<DailyReportDashboardData> {
  assertStorageReady();
  const date = filters.date || todayISO();
  const staffList = (await dbGetStaff()).filter((s) => s.status === "ACTIVE");
  const templates = (await dbListTemplates()).filter((t) => t.active);
  const allItems = await dbListChecklistItems();
  const rawSubs = await dbListSubmissionsByDate(date);
  const answers = await dbListAnswersForSubmissions(rawSubs.map((s) => s.id));

  const submissions = await Promise.all(
    rawSubs.map((s) =>
      enrichSubmission(
        s,
        allItems.filter((i) => i.report_template_id === s.report_template_id),
        answers,
        staffList.find((st) => st.staff_id === s.staff_id),
        templates.find((t) => t.id === s.report_template_id)
      )
    )
  );

  const rows: DailyReportDashboardRow[] = [];

  for (const staff of staffList) {
    if (filters.outlet && filters.outlet !== "ALL" && staff.outlet !== filters.outlet) {
      continue;
    }
    if (filters.staff_id && filters.staff_id !== "ALL" && staff.staff_id !== filters.staff_id) {
      continue;
    }

    const matched = await matchTemplatesForStaff(staff.outlet, staff.position, templates);
    for (const template of matched) {
      if (
        filters.report_template_id &&
        filters.report_template_id !== "ALL" &&
        template.id !== filters.report_template_id
      ) {
        continue;
      }

      const submission =
        submissions.find(
          (s) =>
            s.staff_id === staff.staff_id && s.report_template_id === template.id
        ) || null;

      const submitted = Boolean(submission);
      if (filters.submit_status === "submitted" && !submitted) continue;
      if (filters.submit_status === "not_submitted" && submitted) continue;

      const checklistTotal =
        submission?.checklist_total ??
        (template.checklist_items?.length ||
          allItems.filter((i) => i.report_template_id === template.id).length);
      const checklistChecked = submission?.checklist_checked ?? 0;
      const checklistPercent = submission?.checklist_percent ?? 0;

      const label = rowLabel(
        submitted,
        template.is_required_daily,
        submission?.status_condition,
        submission?.leader_validation
      );

      rows.push({
        staff_id: staff.staff_id,
        staff_name: staff.name,
        outlet: staff.outlet,
        position: staff.position,
        report_template_id: template.id,
        report_title: template.title,
        category: template.category,
        is_required_daily: template.is_required_daily,
        submitted,
        submission,
        submitted_at: submission?.submitted_at ?? null,
        photo_url: submission?.photo_url ?? null,
        note: submission?.note ?? null,
        status_condition: submission?.status_condition ?? null,
        checklist_total: checklistTotal,
        checklist_checked: checklistChecked,
        checklist_percent: checklistPercent,
        label,
      });
    }
  }

  const requiredRows = rows.filter((r) => r.is_required_daily);
  const staffWithRequired = new Set(requiredRows.map((r) => r.staff_id));
  const staffFullySubmitted = new Set<string>();
  for (const staffId of staffWithRequired) {
    const req = requiredRows.filter((r) => r.staff_id === staffId);
    if (req.length > 0 && req.every((r) => r.submitted)) {
      staffFullySubmitted.add(staffId);
    }
  }

  const summary: DailyReportDashboardSummary = {
    total_today: submissions.length,
    staff_submitted: staffFullySubmitted.size,
    staff_not_submitted: Math.max(0, staffWithRequired.size - staffFullySubmitted.size),
    reports_with_issue: submissions.filter((s) =>
      isIssueCondition(s.status_condition)
    ).length,
    complete_ok: rows.filter((r) => r.label === "selesai_lengkap").length,
    complete_with_issue: rows.filter((r) => r.label === "selesai_kendala").length,
    not_submitted: rows.filter((r) => r.label === "belum_submit").length,
  };

  const missing_required = rows.filter((r) => r.is_required_daily && !r.submitted);

  const enrichedSubmissions = submissions.filter((s) => {
    if (filters.outlet && filters.outlet !== "ALL" && s.outlet_id !== filters.outlet)
      return false;
    if (filters.staff_id && filters.staff_id !== "ALL" && s.staff_id !== filters.staff_id)
      return false;
    if (
      filters.report_template_id &&
      filters.report_template_id !== "ALL" &&
      s.report_template_id !== filters.report_template_id
    )
      return false;
    return true;
  });

  return { summary, rows, submissions: enrichedSubmissions, missing_required };
}

export async function getSubmissionById(id: string): Promise<DailyReportSubmission | null> {
  assertStorageReady();
  const sub = await dbGetSubmission(id);
  if (!sub) return null;
  const items = await dbListChecklistItems(sub.report_template_id);
  const answers = await dbListAnswersForSubmissions([sub.id]);
  const staff = await findStaff(sub.staff_id);
  const templates = await dbListTemplates();
  return enrichSubmission(
    sub,
    items,
    answers,
    staff,
    templates.find((t) => t.id === sub.report_template_id)
  );
}

export async function listSubmissionsNeedingFix(
  date?: string
): Promise<DailyReportSubmission[]> {
  assertStorageReady();
  const d = date || todayISO();
  const raw = await dbListSubmissionsNeedingFix(d);
  const allItems = await dbListChecklistItems();
  const answers = await dbListAnswersForSubmissions(raw.map((s) => s.id));
  const staffList = await dbGetStaff();
  const templates = await dbListTemplates();
  return Promise.all(
    raw.map((s) =>
      enrichSubmission(
        s,
        allItems.filter((i) => i.report_template_id === s.report_template_id),
        answers,
        staffList.find((st) => st.staff_id === s.staff_id),
        templates.find((t) => t.id === s.report_template_id)
      )
    )
  );
}

export async function applyLeaderValidation(payload: {
  submission_id: string;
  validation: import("@/lib/types").StaffReportValidationStatus;
  note?: string;
  leader_id?: string;
  leader_name?: string;
  photo_base64?: string;
}): Promise<
  | { success: true; data: DailyReportSubmission }
  | { success: false; error: string }
> {
  assertStorageReady();
  const sub = await dbGetSubmission(payload.submission_id);
  if (!sub) return { success: false, error: "Laporan staff tidak ditemukan." };

  const valid = ["valid", "revisi", "tidak_valid", "manipulasi"];
  if (!valid.includes(payload.validation)) {
    return { success: false, error: "Status validasi tidak valid." };
  }

  if (payload.validation !== "valid" && !(payload.note || "").trim()) {
    return {
      success: false,
      error: "Catatan wajib jika Revisi / Tidak valid / Manipulasi.",
    };
  }

  const updated: DailyReportSubmission = {
    ...sub,
    leader_validation: payload.validation,
    leader_validation_note: (payload.note || "").trim() || null,
    leader_validated_at: nowISO(),
    leader_validated_by: payload.leader_id || "LEADER",
    leader_validated_by_name: payload.leader_name || "Leader",
    leader_validation_photo_url: payload.photo_base64 || sub.leader_validation_photo_url || null,
  };

  await dbUpdateSubmissionValidation(sub.id, updated);
  return { success: true, data: (await getSubmissionById(sub.id))! };
}

/** Upsert semua template dari seed v2 (aman dijalankan ulang). */
export async function seedDailyActivityTemplates(): Promise<{
  templates: number;
  codes: string[];
  position_groups: string[];
}> {
  assertStorageReady();
  const built = buildSeed(DAILY_ACTIVITY_SEED_TEMPLATES.map(seedDefFromV2));
  const codes: string[] = [];
  const positionGroups = new Set<string>();

  for (const tpl of built.templates) {
    const existing = (await dbListTemplates()).find((t) => t.id === tpl.id);
    const toSave: ReportTemplate = existing
      ? {
          ...existing,
          title: tpl.title,
          category: tpl.category,
          outlet_id: tpl.outlet_id,
          position_group: tpl.position_group,
          standard_result: tpl.standard_result,
          description: tpl.description,
          requires_photo: tpl.requires_photo,
          requires_note: Boolean(tpl.requires_note),
          is_required_daily: tpl.is_required_daily,
          kind: tpl.kind,
          target_time_start: tpl.target_time_start,
          target_time_end: tpl.target_time_end,
          active: true,
          sort_order: tpl.sort_order,
        }
      : tpl;

    await dbUpsertTemplate(toSave);
    await dbDeleteChecklistItemsForTemplate(tpl.id);
    const items = built.items.filter((i) => i.report_template_id === tpl.id);
    await dbInsertChecklistItems(items);

    codes.push(tpl.id);
    if (tpl.position_group) positionGroups.add(tpl.position_group);
  }

  return {
    templates: codes.length,
    codes,
    position_groups: [...positionGroups].sort(),
  };
}

export async function normalizeStaffPositionsInCache(staffList?: Staff[]): Promise<{
  total: number;
  updated: number;
  unchanged: number;
  unresolved: { staff_id: string; name: string; position: string | null }[];
  updated_staff: Staff[];
}> {
  assertStorageReady();
  if (staffList?.length) await setStaffCache(staffList);
  const cache = await dbGetStaff();
  let updated = 0;
  let unchanged = 0;
  const unresolved: { staff_id: string; name: string; position: string | null }[] = [];
  const updated_staff: Staff[] = [];

  for (const s of cache) {
    const resolved = resolveStaffPositionGroup(s.position || "");
    if (!resolved) {
      unresolved.push({
        staff_id: s.staff_id,
        name: s.name,
        position: s.position || null,
      });
      unchanged += 1;
      continue;
    }
    if (s.position === resolved) {
      unchanged += 1;
      continue;
    }
    s.position = resolved;
    s.updated_at = nowISO();
    updated += 1;
    updated_staff.push(s);
  }

  if (updated_staff.length > 0) {
    await dbUpsertStaff(updated_staff);
  }

  return {
    total: cache.length,
    updated,
    unchanged,
    unresolved,
    updated_staff,
  };
}

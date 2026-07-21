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

export { normalizePositionGroup } from "./position-groups";

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

/** Nama → slug pendek: "DUL" → "dul", "Budi Santoso" → "budisantoso" */
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
  const tpl = templateGroup.trim().toLowerCase();
  if (staffGroup.toLowerCase() === tpl) return true;
  // also allow raw position match
  return staffPosition.trim().toLowerCase() === tpl;
}

const seedStaff: Staff[] = [
  {
    staff_id: "STF-001",
    name: "Budi Santoso",
    position: "Cook",
    outlet: "KBU",
    area: "Dapur",
    wa_number: "6281234567890",
    role: "STAFF",
    status: "ACTIVE",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    staff_id: "STF-002",
    name: "Ani Wijaya",
    position: "Barista",
    outlet: "Kisamen",
    area: "Bar",
    wa_number: "6281234567891",
    role: "STAFF",
    status: "ACTIVE",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    staff_id: "STF-003",
    name: "Rina Putri",
    position: "Server",
    outlet: "KBU",
    area: "Floor",
    wa_number: "6281234567892",
    role: "STAFF",
    status: "ACTIVE",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    staff_id: "STF-004",
    name: "Dedi Pratama",
    position: "PA",
    outlet: "KBU",
    area: "Outdoor",
    wa_number: "6281234567893",
    role: "STAFF",
    status: "ACTIVE",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    staff_id: "STF-L01",
    name: "Leader KBU",
    position: "Leader",
    outlet: "KBU",
    area: "Floor",
    wa_number: "6281110001001",
    role: "LEADER",
    status: "ACTIVE",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
  {
    staff_id: "STF-L02",
    name: "Leader Kisamen",
    position: "Leader",
    outlet: "Kisamen",
    area: "Bar",
    wa_number: "6281110001002",
    role: "LEADER",
    status: "ACTIVE",
    created_at: nowISO(),
    updated_at: nowISO(),
  },
];

type SeedDef = {
  id: string;
  title: string;
  category: ReportTemplateCategory;
  position_group: string | null;
  outlet_id?: string | null;
  standard_result: string;
  requires_photo: boolean;
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

const { templates: seedTemplates, items: seedChecklistItems } = buildSeed(
  DAILY_ACTIVITY_SEED_TEMPLATES.map(seedDefFromV2)
);


const seedTokenBudi =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00";
const seedTokenRina =
  "b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011";
const seedTokenAni =
  "c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122";
const seedTokenDedi =
  "d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00112233";

type StoreState = {
  links: StaffReportLink[];
  templates: ReportTemplate[];
  checklistItems: ReportTemplateChecklistItem[];
  submissions: DailyReportSubmission[];
  answers: DailyReportChecklistAnswer[];
  staffCache: Staff[];
};

const globalKey = "__nusa_staff_report_store_v6_v2port__";

function getState(): StoreState {
  const g = globalThis as unknown as Record<string, StoreState | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = {
      links: [
        {
          id: "SRL-001",
          staff_id: "STF-001",
          token: seedTokenBudi,
          short_code: "budi",
          is_active: true,
          created_at: nowISO(),
          revoked_at: null,
        },
        {
          id: "SRL-002",
          staff_id: "STF-003",
          token: seedTokenRina,
          short_code: "rina",
          is_active: true,
          created_at: nowISO(),
          revoked_at: null,
        },
        {
          id: "SRL-003",
          staff_id: "STF-002",
          token: seedTokenAni,
          short_code: "ani",
          is_active: true,
          created_at: nowISO(),
          revoked_at: null,
        },
        {
          id: "SRL-004",
          staff_id: "STF-004",
          token: seedTokenDedi,
          short_code: "dedi",
          is_active: true,
          created_at: nowISO(),
          revoked_at: null,
        },
      ],
      templates: [...seedTemplates],
      checklistItems: [...seedChecklistItems],
      submissions: [],
      answers: [],
      staffCache: [...seedStaff],
    };
  }
  return g[globalKey]!;
}

function ensureUniqueShortCode(base: string, excludeLinkId?: string): string {
  let code = base || "staff";
  let n = 0;
  const links = getState().links;
  while (
    links.some(
      (l) => l.is_active && l.short_code === code && l.id !== excludeLinkId
    )
  ) {
    n += 1;
    code = `${base}${n}`;
  }
  return code;
}

/** Pastikan link punya short_code (migrasi link lama). */
function ensureLinkShortCode(link: StaffReportLink): StaffReportLink {
  if (link.short_code) return link;
  const staff = findStaff(link.staff_id);
  const base = slugifyStaffName(staff?.name || link.staff_id);
  link.short_code = ensureUniqueShortCode(base, link.id);
  return link;
}

export function setStaffCache(staff: Staff[]): void {
  if (staff.length > 0) getState().staffCache = staff;
}

export function getStaffCache(): Staff[] {
  return getState().staffCache;
}

function findStaff(staffId: string): Staff | undefined {
  return getState().staffCache.find((s) => s.staff_id === staffId);
}

export function getChecklistItemsForTemplate(
  templateId: string
): ReportTemplateChecklistItem[] {
  return getState()
    .checklistItems.filter((i) => i.report_template_id === templateId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function enrichTemplate(template: ReportTemplate): ReportTemplate {
  return {
    ...template,
    checklist_items: getChecklistItemsForTemplate(template.id),
  };
}

export function matchTemplatesForStaff(
  outlet: string,
  position: string,
  templates?: ReportTemplate[]
): ReportTemplate[] {
  const list = (templates ?? getState().templates).filter((t) => t.active);
  return list
    .filter((t) => {
      const outletOk = !t.outlet_id || t.outlet_id === outlet;
      const positionOk = matchesPositionGroup(t.position_group, position);
      return outletOk && positionOk;
    })
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(enrichTemplate);
}

function enrichLink(link: StaffReportLink, origin?: string): StaffReportLink {
  ensureLinkShortCode(link);
  const staff = findStaff(link.staff_id);
  const base = origin || "";
  return {
    ...link,
    staff_name: staff?.name,
    outlet: staff?.outlet,
    position: staff?.position,
    report_url: `${base}/r/${link.short_code}`,
    report_url_long: `${base}/r/${link.token}`,
  };
}

export function listStaffReportLinks(origin?: string): StaffReportLink[] {
  return getState().links.map((l) => enrichLink(l, origin));
}

/** Cari link by short_code ATAU token panjang */
export function getLinkByToken(tokenOrCode: string): StaffReportLink | undefined {
  const key = (tokenOrCode || "").trim().toLowerCase();
  if (!key) return undefined;
  const link = getState().links.find(
    (l) =>
      l.token === tokenOrCode ||
      l.token.toLowerCase() === key ||
      (l.short_code && l.short_code.toLowerCase() === key)
  );
  if (link) ensureLinkShortCode(link);
  return link;
}

export function generateStaffReportLink(
  staffId: string,
  origin?: string
): { success: true; data: StaffReportLink } | { success: false; error: string } {
  const staff = findStaff(staffId);
  if (!staff) return { success: false, error: "Staff tidak ditemukan" };
  if (staff.status !== "ACTIVE") return { success: false, error: "Staff tidak aktif" };

  const state = getState();
  for (const link of state.links) {
    if (link.staff_id === staffId && link.is_active) {
      link.is_active = false;
      link.revoked_at = nowISO();
    }
  }

  const short_code = ensureUniqueShortCode(slugifyStaffName(staff.name));
  const newLink: StaffReportLink = {
    id: uid("SRL"),
    staff_id: staffId,
    token: generateReportToken(),
    short_code,
    is_active: true,
    created_at: nowISO(),
    revoked_at: null,
  };
  state.links.push(newLink);
  return { success: true, data: enrichLink(newLink, origin) };
}

export function revokeStaffReportLink(
  linkId: string
): { success: true; data: StaffReportLink } | { success: false; error: string } {
  const link = getState().links.find((l) => l.id === linkId);
  if (!link) return { success: false, error: "Link tidak ditemukan" };
  link.is_active = false;
  link.revoked_at = nowISO();
  return { success: true, data: enrichLink(link) };
}

function replaceChecklistItems(
  templateId: string,
  items: { item_text: string; is_required?: boolean; sort_order?: number }[]
): void {
  const state = getState();
  state.checklistItems = state.checklistItems.filter(
    (i) => i.report_template_id !== templateId
  );
  const created = nowISO();
  items.forEach((item, index) => {
    const text = item.item_text.trim();
    if (!text) return;
    state.checklistItems.push({
      id: uid("RTCI"),
      report_template_id: templateId,
      item_text: text,
      is_required: item.is_required !== false,
      sort_order: item.sort_order ?? index + 1,
      created_at: created,
    });
  });
}

export function listReportTemplates(): ReportTemplate[] {
  return [...getState().templates]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(enrichTemplate);
}

export function createReportTemplate(
  payload: CreateReportTemplatePayload
): ReportTemplate {
  const template: ReportTemplate = {
    id: uid("RTPL"),
    title: payload.title.trim(),
    category: payload.category || "General",
    outlet_id: payload.outlet_id ?? null,
    position_group: payload.position_group ?? null,
    standard_result: (payload.standard_result || payload.description || "").trim(),
    description: (payload.description || payload.standard_result || "").trim(),
    requires_photo: Boolean(payload.requires_photo),
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
  getState().templates.push(template);
  if (payload.checklist_items?.length) {
    replaceChecklistItems(template.id, payload.checklist_items);
  }
  return enrichTemplate(template);
}

export function updateReportTemplate(
  payload: UpdateReportTemplatePayload
): { success: true; data: ReportTemplate } | { success: false; error: string } {
  const template = getState().templates.find((t) => t.id === payload.id);
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
    replaceChecklistItems(template.id, payload.checklist_items);
  }

  return { success: true, data: enrichTemplate(template) };
}

function enrichSubmission(sub: DailyReportSubmission): DailyReportSubmission {
  const answers = getState()
    .answers.filter((a) => a.submission_id === sub.id)
    .map((a) => {
      const item = getState().checklistItems.find((i) => i.id === a.checklist_item_id);
      return { ...a, item_text: item?.item_text };
    });
  const total = answers.length;
  const checked = answers.filter((a) => a.checked).length;
  const staff = findStaff(sub.staff_id);
  const template = getState().templates.find((t) => t.id === sub.report_template_id);
  return {
    ...sub,
    checklist_answers: answers,
    checklist_total: total,
    checklist_checked: checked,
    checklist_percent: total > 0 ? Math.round((checked / total) * 100) : 0,
    staff_name: sub.staff_name || staff?.name,
    outlet: sub.outlet || staff?.outlet || sub.outlet_id,
    report_title: sub.report_title || template?.title,
    position: sub.position || staff?.position,
  };
}

export function getStaffReportByToken(
  token: string
): { success: true; data: StaffReportLinkContext } | { success: false; error: string } {
  if (!token || token.trim().length < 2) {
    return { success: false, error: "Token tidak valid" };
  }

  const link = getLinkByToken(token.trim());
  if (!link) {
    return { success: false, error: "Link tidak ditemukan. Hubungi atasan Anda." };
  }
  if (!link.is_active) {
    return {
      success: false,
      error: "Link sudah dinonaktifkan. Minta link baru ke atasan Anda.",
    };
  }

  const staff = findStaff(link.staff_id);
  if (!staff || staff.status !== "ACTIVE") {
    return { success: false, error: "Staff tidak aktif. Hubungi atasan Anda." };
  }

  const templates = matchTemplatesForStaff(staff.outlet, staff.position);
  const today = todayISO();
  const today_submissions = getState()
    .submissions.filter((s) => s.staff_id === staff.staff_id && s.report_date === today)
    .map(enrichSubmission);

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

export function submitDailyReport(input: {
  token: string;
  report_template_id: string;
  status_condition: ReportConditionStatus;
  note?: string;
  photo_url?: string | null;
  checklist_answers: { checklist_item_id: string; checked: boolean }[];
}): { success: true; data: DailyReportSubmission } | { success: false; error: string } {
  const ctx = getStaffReportByToken(input.token);
  if (!ctx.success) return ctx;

  const { staff, templates } = ctx.data;
  const template = templates.find((t) => t.id === input.report_template_id);
  if (!template) {
    return { success: false, error: "Kegiatan tidak tersedia untuk staff ini." };
  }

  const items = template.checklist_items || getChecklistItemsForTemplate(template.id);
  const answerMap = new Map(
    (input.checklist_answers || []).map((a) => [a.checklist_item_id, Boolean(a.checked)])
  );

  // Validate required checklist items belong to this template
  for (const a of input.checklist_answers || []) {
    if (!items.some((i) => i.id === a.checklist_item_id)) {
      return { success: false, error: "Checklist tidak valid untuk kegiatan ini." };
    }
  }

  const missingRequired = items.filter(
    (i) => i.is_required && !answerMap.get(i.id)
  );
  // Allow submit with unchecked items — dashboard shows %, but required items
  // should ideally be checked. Soft-validate: at least one item must be answered.
  if (items.length > 0 && (input.checklist_answers || []).length === 0) {
    return { success: false, error: "Centang checklist kegiatan terlebih dahulu." };
  }

  // Soft warning: if all required unchecked, still allow but prefer checking
  void missingRequired;

  if (template.requires_photo && !input.photo_url) {
    const today = todayISO();
    const existing = getState().submissions.find(
      (s) =>
        s.staff_id === staff.staff_id &&
        s.report_template_id === template.id &&
        s.report_date === today &&
        s.photo_url
    );
    if (!existing) {
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
  if (isIssueCondition(input.status_condition) && !note) {
    return {
      success: false,
      error: "Catatan kendala wajib diisi jika status bukan Aman.",
    };
  }

  const today = todayISO();
  const submittedAt = nowISO();
  const state = getState();

  const existing = state.submissions.find(
    (s) =>
      s.staff_id === staff.staff_id &&
      s.report_template_id === template.id &&
      s.report_date === today
  );

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
    // Staff kirim ulang → reset validasi leader (harus dicek ulang)
    existing.leader_validation = null;
    existing.leader_validation_note = null;
    existing.leader_validated_at = null;
    existing.leader_validated_by = null;
    existing.leader_validated_by_name = null;
    existing.leader_validation_photo_url = null;
    // replace answers
    state.answers = state.answers.filter((a) => a.submission_id !== existing.id);
    submission = existing;
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
    state.submissions.push(submission);
  }

  for (const item of items) {
    state.answers.push({
      id: uid("DRCA"),
      submission_id: submission.id,
      checklist_item_id: item.id,
      checked: Boolean(answerMap.get(item.id)),
      created_at: submittedAt,
    });
  }

  return { success: true, data: enrichSubmission(submission) };
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

export function buildDailyReportDashboard(
  filters: DailyReportFilters = {}
): DailyReportDashboardData {
  const date = filters.date || todayISO();
  const staffList = getState().staffCache.filter((s) => s.status === "ACTIVE");
  const templates = getState().templates.filter((t) => t.active);
  const submissions = getState()
    .submissions.filter((s) => s.report_date === date)
    .map(enrichSubmission);

  const rows: DailyReportDashboardRow[] = [];

  for (const staff of staffList) {
    if (filters.outlet && filters.outlet !== "ALL" && staff.outlet !== filters.outlet) {
      continue;
    }
    if (filters.staff_id && filters.staff_id !== "ALL" && staff.staff_id !== filters.staff_id) {
      continue;
    }

    const matched = matchTemplatesForStaff(staff.outlet, staff.position, templates);
    for (const template of matched) {
      // Skip quick-issue from default required matrix unless filtered
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
          getChecklistItemsForTemplate(template.id).length);
      const checklistChecked = submission?.checklist_checked ?? 0;
      const checklistPercent =
        submission?.checklist_percent ??
        (checklistTotal > 0 ? 0 : 0);

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

export function getSubmissionById(id: string): DailyReportSubmission | null {
  const sub = getState().submissions.find((s) => s.id === id);
  return sub ? enrichSubmission(sub) : null;
}

export function listSubmissionsNeedingFix(date?: string): DailyReportSubmission[] {
  const d = date || todayISO();
  return getState()
    .submissions.filter((s) => s.report_date === d)
    .filter(
      (s) =>
        s.leader_validation === "revisi" ||
        s.leader_validation === "tidak_valid" ||
        s.leader_validation === "manipulasi"
    )
    .map(enrichSubmission);
}

export function applyLeaderValidation(payload: {
  submission_id: string;
  validation: import("@/lib/types").StaffReportValidationStatus;
  note?: string;
  leader_id?: string;
  leader_name?: string;
  photo_base64?: string;
}):
  | { success: true; data: DailyReportSubmission }
  | { success: false; error: string } {
  const sub = getState().submissions.find((s) => s.id === payload.submission_id);
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

  sub.leader_validation = payload.validation;
  sub.leader_validation_note = (payload.note || "").trim() || null;
  sub.leader_validated_at = nowISO();
  sub.leader_validated_by = payload.leader_id || "LEADER";
  sub.leader_validated_by_name = payload.leader_name || "Leader";
  if (payload.photo_base64) {
    sub.leader_validation_photo_url = payload.photo_base64;
  }

  return { success: true, data: enrichSubmission(sub) };
}

/** Upsert semua template dari seed v2 (aman dijalankan ulang). */
export function seedDailyActivityTemplates(): {
  templates: number;
  codes: string[];
  position_groups: string[];
} {
  const state = getState();
  const built = buildSeed(DAILY_ACTIVITY_SEED_TEMPLATES.map(seedDefFromV2));
  const codes: string[] = [];
  const positionGroups = new Set<string>();
  const created = nowISO();

  for (const tpl of built.templates) {
    const existing = state.templates.find((t) => t.id === tpl.id);
    if (existing) {
      existing.title = tpl.title;
      existing.category = tpl.category;
      existing.outlet_id = tpl.outlet_id;
      existing.position_group = tpl.position_group;
      existing.standard_result = tpl.standard_result;
      existing.description = tpl.description;
      existing.requires_photo = tpl.requires_photo;
      existing.is_required_daily = tpl.is_required_daily;
      existing.kind = tpl.kind;
      existing.target_time_start = tpl.target_time_start;
      existing.target_time_end = tpl.target_time_end;
      existing.active = true;
      existing.sort_order = tpl.sort_order;
    } else {
      state.templates.push({ ...tpl, created_at: created });
    }
    // replace checklist items for this template
    state.checklistItems = state.checklistItems.filter(
      (c) => c.report_template_id !== tpl.id
    );
    const items = built.items.filter((i) => i.report_template_id === tpl.id);
    state.checklistItems.push(...items.map((i) => ({ ...i, created_at: created })));

    codes.push(tpl.id);
    if (tpl.position_group) positionGroups.add(tpl.position_group);
  }

  return {
    templates: codes.length,
    codes,
    position_groups: [...positionGroups].sort(),
  };
}

/** Normalisasi jabatan di staff cache → posisi standar (PA, Kasir, dll). */
export function normalizeStaffPositionsInCache(staffList?: Staff[]): {
  total: number;
  updated: number;
  unchanged: number;
  unresolved: { staff_id: string; name: string; position: string | null }[];
  updated_staff: Staff[];
} {
  if (staffList?.length) setStaffCache(staffList);
  const cache = getState().staffCache;
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

  return {
    total: cache.length,
    updated,
    unchanged,
    unresolved,
    updated_staff,
  };
}

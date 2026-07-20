import { randomBytes } from "crypto";
import type {
  Staff,
  StaffReportLink,
  ReportTemplate,
  DailyReportSubmission,
  CreateReportTemplatePayload,
  UpdateReportTemplatePayload,
  DailyReportFilters,
  DailyReportDashboardData,
  DailyReportDashboardRow,
  DailyReportDashboardSummary,
  StaffReportLinkContext,
  Outlet,
} from "./types";

// Module-level store (works for single-process / local demo).
// Production persistence: implement GAS sheets or PostgreSQL (see docs).

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

/** Secure random token — 64 hex chars (256 bits) */
export function generateReportToken(): string {
  return randomBytes(32).toString("hex");
}

export function normalizePositionGroup(position: string): string {
  return (position || "").trim();
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
];

const seedTemplates: ReportTemplate[] = [
  {
    id: "RTPL-001",
    outlet_id: null,
    position_group: "Cook",
    title: "Laporan Dapur Harian",
    description: "Cek kebersihan dapur, stock bahan, dan kondisi peralatan.",
    requires_photo: true,
    is_required_daily: true,
    active: true,
    sort_order: 1,
    created_at: nowISO(),
  },
  {
    id: "RTPL-002",
    outlet_id: null,
    position_group: "Barista",
    title: "Laporan Bar Harian",
    description: "Cek mesin kopi, stock susu/sirup, dan kebersihan bar.",
    requires_photo: true,
    is_required_daily: true,
    active: true,
    sort_order: 1,
    created_at: nowISO(),
  },
  {
    id: "RTPL-003",
    outlet_id: "KBU",
    position_group: "Server",
    title: "Laporan Floor KBU",
    description: "Cek area makan, toilet tamu, dan kelengkapan meja.",
    requires_photo: false,
    is_required_daily: true,
    active: true,
    sort_order: 1,
    created_at: nowISO(),
  },
  {
    id: "RTPL-004",
    outlet_id: null,
    position_group: null,
    title: "Laporan Kendala / Insiden",
    description: "Laporkan kendala operasional, kerusakan, atau isu lain.",
    requires_photo: false,
    is_required_daily: false,
    active: true,
    sort_order: 99,
    created_at: nowISO(),
  },
];

const seedTokenBudi = "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00";

type StoreState = {
  links: StaffReportLink[];
  templates: ReportTemplate[];
  submissions: DailyReportSubmission[];
  /** Optional staff override from live getStaff — not persisted */
  staffCache: Staff[];
};

const globalKey = "__nusa_staff_report_store__";

function getState(): StoreState {
  const g = globalThis as unknown as Record<string, StoreState | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = {
      links: [
        {
          id: "SRL-001",
          staff_id: "STF-001",
          token: seedTokenBudi,
          is_active: true,
          created_at: nowISO(),
          revoked_at: null,
        },
      ],
      templates: [...seedTemplates],
      submissions: [],
      staffCache: [...seedStaff],
    };
  }
  return g[globalKey]!;
}

export function setStaffCache(staff: Staff[]): void {
  const state = getState();
  if (staff.length > 0) {
    state.staffCache = staff;
  }
}

export function getStaffCache(): Staff[] {
  return getState().staffCache;
}

function findStaff(staffId: string): Staff | undefined {
  return getState().staffCache.find((s) => s.staff_id === staffId);
}

export function matchTemplatesForStaff(
  outlet: string,
  position: string,
  templates?: ReportTemplate[]
): ReportTemplate[] {
  const positionGroup = normalizePositionGroup(position);
  const list = (templates ?? getState().templates).filter((t) => t.active);
  return list
    .filter((t) => {
      const outletOk = !t.outlet_id || t.outlet_id === outlet;
      const positionOk =
        !t.position_group ||
        normalizePositionGroup(t.position_group).toLowerCase() ===
          positionGroup.toLowerCase();
      return outletOk && positionOk;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

function enrichLink(link: StaffReportLink, origin?: string): StaffReportLink {
  const staff = findStaff(link.staff_id);
  const base = origin || "";
  return {
    ...link,
    staff_name: staff?.name,
    outlet: staff?.outlet,
    position: staff?.position,
    report_url: `${base}/r/${link.token}`,
  };
}

// ---------- Links ----------

export function listStaffReportLinks(origin?: string): StaffReportLink[] {
  return getState().links.map((l) => enrichLink(l, origin));
}

export function getActiveLinkByStaff(staffId: string): StaffReportLink | undefined {
  return getState().links.find((l) => l.staff_id === staffId && l.is_active);
}

export function getLinkByToken(token: string): StaffReportLink | undefined {
  return getState().links.find((l) => l.token === token);
}

export function generateStaffReportLink(
  staffId: string,
  origin?: string
): { success: true; data: StaffReportLink } | { success: false; error: string } {
  const staff = findStaff(staffId);
  if (!staff) {
    return { success: false, error: "Staff tidak ditemukan" };
  }
  if (staff.status !== "ACTIVE") {
    return { success: false, error: "Staff tidak aktif" };
  }

  const state = getState();
  // Revoke existing active links for this staff (one permanent link at a time)
  for (const link of state.links) {
    if (link.staff_id === staffId && link.is_active) {
      link.is_active = false;
      link.revoked_at = nowISO();
    }
  }

  const newLink: StaffReportLink = {
    id: uid("SRL"),
    staff_id: staffId,
    token: generateReportToken(),
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

// ---------- Templates ----------

export function listReportTemplates(): ReportTemplate[] {
  return [...getState().templates].sort((a, b) => a.sort_order - b.sort_order);
}

export function createReportTemplate(
  payload: CreateReportTemplatePayload
): ReportTemplate {
  const template: ReportTemplate = {
    id: uid("RTPL"),
    outlet_id: payload.outlet_id ?? null,
    position_group: payload.position_group ?? null,
    title: payload.title.trim(),
    description: (payload.description || "").trim(),
    requires_photo: Boolean(payload.requires_photo),
    is_required_daily: Boolean(payload.is_required_daily),
    active: payload.active !== false,
    sort_order: payload.sort_order ?? 10,
    created_at: nowISO(),
  };
  getState().templates.push(template);
  return template;
}

export function updateReportTemplate(
  payload: UpdateReportTemplatePayload
): { success: true; data: ReportTemplate } | { success: false; error: string } {
  const template = getState().templates.find((t) => t.id === payload.id);
  if (!template) return { success: false, error: "Template tidak ditemukan" };

  if (payload.title !== undefined) template.title = payload.title.trim();
  if (payload.description !== undefined) template.description = payload.description.trim();
  if (payload.outlet_id !== undefined) template.outlet_id = payload.outlet_id;
  if (payload.position_group !== undefined) template.position_group = payload.position_group;
  if (payload.requires_photo !== undefined) template.requires_photo = payload.requires_photo;
  if (payload.is_required_daily !== undefined)
    template.is_required_daily = payload.is_required_daily;
  if (payload.active !== undefined) template.active = payload.active;
  if (payload.sort_order !== undefined) template.sort_order = payload.sort_order;

  return { success: true, data: template };
}

// ---------- Public context + submit ----------

export function getStaffReportByToken(
  token: string
): { success: true; data: StaffReportLinkContext } | { success: false; error: string } {
  if (!token || token.length < 16) {
    return { success: false, error: "Token tidak valid" };
  }

  const link = getLinkByToken(token);
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
  const today_submissions = getState().submissions.filter(
    (s) => s.staff_id === staff.staff_id && s.report_date === today
  );

  return {
    success: true,
    data: {
      link: { ...link, staff_name: staff.name, outlet: staff.outlet, position: staff.position },
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

export function submitDailyReport(input: {
  token: string;
  report_template_id: string;
  note?: string;
  photo_url?: string | null;
}): { success: true; data: DailyReportSubmission } | { success: false; error: string } {
  const ctx = getStaffReportByToken(input.token);
  if (!ctx.success) return ctx;

  const { staff, templates } = ctx.data;
  const template = templates.find((t) => t.id === input.report_template_id);
  if (!template) {
    return {
      success: false,
      error: "Jenis report tidak tersedia untuk staff ini.",
    };
  }

  if (template.requires_photo && !input.photo_url) {
    // Allow update without re-uploading if a previous photo already exists today
    const today = todayISO();
    const existingForPhoto = getState().submissions.find(
      (s) =>
        s.staff_id === staff.staff_id &&
        s.report_template_id === template.id &&
        s.report_date === today &&
        s.photo_url
    );
    if (!existingForPhoto) {
      return { success: false, error: "Foto wajib untuk jenis report ini." };
    }
  }

  const note = (input.note || "").trim();
  const today = todayISO();
  const submittedAt = nowISO();

  // Upsert: one submission per staff + template + date
  const state = getState();
  const existing = state.submissions.find(
    (s) =>
      s.staff_id === staff.staff_id &&
      s.report_template_id === template.id &&
      s.report_date === today
  );

  const hasIssue =
    /kendala|rusak|habis|kosong|problem|masalah|insiden/i.test(note) ||
    template.title.toLowerCase().includes("kendala");

  if (existing) {
    existing.note = note;
    existing.photo_url = input.photo_url ?? existing.photo_url;
    existing.submitted_at = submittedAt;
    existing.status = hasIssue ? "issue" : "submitted";
    existing.staff_name = staff.name;
    existing.outlet = staff.outlet;
    existing.report_title = template.title;
    existing.position = staff.position;
    return { success: true, data: existing };
  }

  const submission: DailyReportSubmission = {
    id: uid("DRS"),
    staff_id: staff.staff_id,
    outlet_id: staff.outlet,
    report_template_id: template.id,
    report_date: today,
    note,
    photo_url: input.photo_url ?? null,
    status: hasIssue ? "issue" : "submitted",
    submitted_at: submittedAt,
    created_at: submittedAt,
    staff_name: staff.name,
    outlet: staff.outlet,
    report_title: template.title,
    position: staff.position,
  };
  state.submissions.push(submission);
  return { success: true, data: submission };
}

// ---------- Dashboard ----------

export function buildDailyReportDashboard(
  filters: DailyReportFilters = {}
): DailyReportDashboardData {
  const date = filters.date || todayISO();
  const staffList = getState().staffCache.filter((s) => s.status === "ACTIVE");
  const templates = getState().templates.filter((t) => t.active);
  const submissions = getState().submissions.filter((s) => s.report_date === date);

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

      rows.push({
        staff_id: staff.staff_id,
        staff_name: staff.name,
        outlet: staff.outlet,
        position: staff.position,
        report_template_id: template.id,
        report_title: template.title,
        is_required_daily: template.is_required_daily,
        submitted,
        submission,
        submitted_at: submission?.submitted_at ?? null,
        photo_url: submission?.photo_url ?? null,
        note: submission?.note ?? null,
        status: submission?.status ?? null,
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
    reports_with_issue: submissions.filter(
      (s) => s.status === "issue" || (s.note && /kendala|rusak|habis|masalah|insiden/i.test(s.note))
    ).length,
  };

  const missing_required = rows.filter((r) => r.is_required_daily && !r.submitted);

  const enrichedSubmissions = submissions
    .map((s) => {
      const staff = findStaff(s.staff_id);
      const template = templates.find((t) => t.id === s.report_template_id);
      return {
        ...s,
        staff_name: s.staff_name || staff?.name,
        outlet: s.outlet || staff?.outlet || s.outlet_id,
        report_title: s.report_title || template?.title,
        position: s.position || staff?.position,
      };
    })
    .filter((s) => {
      if (filters.outlet && filters.outlet !== "ALL" && s.outlet_id !== filters.outlet) return false;
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

export function syncStaffFromList(staff: Staff[]): void {
  setStaffCache(staff);
}

export type { Outlet };

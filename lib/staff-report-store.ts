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

/** Map jabatan staff → position_group template */
export function normalizePositionGroup(position: string): string {
  const p = (position || "").trim().toLowerCase();
  if (!p) return "";
  if (
    ["waiter", "waiters", "server", "floor", "cleaning", "pramusaji", "kasir"].some((k) =>
      p.includes(k)
    )
  ) {
    return "Waiters";
  }
  if (["barista", "bar", "bartender"].some((k) => p.includes(k))) {
    return "Bar";
  }
  if (["cook", "chef", "dapur", "kitchen", "produksi"].some((k) => p.includes(k))) {
    return "Dapur";
  }
  // fallback: capitalize first letter groups or raw
  if (p === "waiters" || p === "bar" || p === "dapur") {
    return p.charAt(0).toUpperCase() + p.slice(1);
  }
  return position.trim();
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
];

type SeedDef = {
  id: string;
  title: string;
  category: ReportTemplateCategory;
  position_group: string;
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
      position_group: d.position_group,
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

const { templates: seedTemplates, items: seedChecklistItems } = buildSeed([
  // —— Waiters (5) ——
  {
    id: "RTPL-W01",
    title: "Opening Area Customer",
    category: "Opening",
    position_group: "Waiters",
    standard_result:
      "Area customer siap buka: bersih, meja rapi, lampu/AC/musik OK, siap terima tamu.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "07:30",
    target_time_end: "08:30",
    sort_order: 1,
    checklist: [
      "Lantai area customer bersih / tidak becek",
      "Meja dan kursi rapi, tidak goyang",
      "Peralatan makan/serbet tersedia di stasiun",
      "Lampu dan AC menyala sesuai standar",
      "Musik / ambience aktif",
      "Pintu masuk dan area depan bersih",
      "Tidak ada sampah atau barang berserakan",
    ],
  },
  {
    id: "RTPL-W02",
    title: "Bersihin WC",
    category: "Cleaning",
    position_group: "Waiters",
    standard_result:
      "WC bersih, kering, tidak bau, sabun/tisu tersedia, sampah kosong, siap dipakai customer.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "09:00",
    target_time_end: "10:00",
    sort_order: 2,
    checklist: [
      "Lantai sudah disikat / dipel",
      "Closet bersih",
      "Wastafel bersih",
      "Kaca bersih",
      "Sampah sudah dibuang",
      "Sabun tersedia",
      "Tisu tersedia",
      "Tidak bau",
      "Lantai tidak becek / tidak ada genangan air",
    ],
  },
  {
    id: "RTPL-W03",
    title: "Cek Meja dan Kursi",
    category: "Cleaning",
    position_group: "Waiters",
    standard_result: "Semua meja/kursi bersih, stabil, siap pakai customer.",
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "10:00",
    target_time_end: "11:00",
    sort_order: 3,
    checklist: [
      "Permukaan meja bersih (tidak lengket)",
      "Kursi bersih dan tidak goyang",
      "Tidak ada sisa makanan / noda",
      "Layout meja rapi sesuai standar",
      "Condiment / tissue meja lengkap",
    ],
  },
  {
    id: "RTPL-W04",
    title: "Cek Tanaman",
    category: "Maintenance",
    position_group: "Waiters",
    standard_result: "Tanaman hijau, pot bersih, tidak layu / kering.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "11:00",
    target_time_end: "12:00",
    sort_order: 4,
    checklist: [
      "Daun tidak layu / kuning berlebih",
      "Tanah cukup lembab (disiram jika perlu)",
      "Pot dan area sekitar bersih dari sampah daun",
      "Tanaman tidak menghalangi jalan customer",
    ],
  },
  {
    id: "RTPL-W05",
    title: "Closing Area Customer",
    category: "Closing",
    position_group: "Waiters",
    standard_result: "Area customer bersih, sampah dibuang, siap buka esok hari.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "21:00",
    target_time_end: "22:00",
    sort_order: 5,
    checklist: [
      "Semua meja dibersihkan",
      "Kursi dirapikan",
      "Lantai dipel / disapu",
      "Sampah area customer dibuang",
      "Lampu / AC dimatikan sesuai SOP",
      "Pintu / area aman",
    ],
  },
  // —— Bar (5) ——
  {
    id: "RTPL-B01",
    title: "Opening Bar",
    category: "Opening",
    position_group: "Bar",
    standard_result: "Bar siap operasional: mesin OK, area bersih, stok awal cukup.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "07:30",
    target_time_end: "08:30",
    sort_order: 1,
    checklist: [
      "Area bar bersih dan rapi",
      "Mesin espresso menyala / siap",
      "Grinder dicek dan siap",
      "Steam wand bersih",
      "Stok susu / sirup cukup untuk opening",
      "Cup, lid, sedotan tersedia di stasiun",
    ],
  },
  {
    id: "RTPL-B02",
    title: "Cek Stok Cup / Sedotan",
    category: "Stock",
    position_group: "Bar",
    standard_result: "Stok cup, lid, sedotan cukup untuk operasional hari ini.",
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "09:00",
    target_time_end: "10:00",
    sort_order: 2,
    checklist: [
      "Cup hot cukup",
      "Cup cold cukup",
      "Lid tersedia",
      "Sedotan tersedia",
      "Tissue / napkin stasiun cukup",
      "Catat item yang hampir habis",
    ],
  },
  {
    id: "RTPL-B03",
    title: "Cek Mesin dan Grinder",
    category: "Maintenance",
    position_group: "Bar",
    standard_result: "Mesin dan grinder berfungsi normal, tidak ada kebocoran / bunyi aneh.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "10:00",
    target_time_end: "11:00",
    sort_order: 3,
    checklist: [
      "Tekanan mesin normal",
      "Grinder mengeluarkan bubuk konsisten",
      "Tidak ada kebocoran air / uap",
      "Drip tray bersih",
      "Group head bersih",
    ],
  },
  {
    id: "RTPL-B04",
    title: "Bersihin Bar",
    category: "Cleaning",
    position_group: "Bar",
    standard_result: "Area bar bersih, counter kering, alat dicuci / disimpan rapi.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "14:00",
    target_time_end: "15:00",
    sort_order: 4,
    checklist: [
      "Counter bar dibersihkan",
      "Alat shaker / spoon dicuci",
      "Spill mat / drip tray bersih",
      "Lantai area bar tidak lengket",
      "Sampah bar dibuang",
    ],
  },
  {
    id: "RTPL-B05",
    title: "Closing Bar",
    category: "Closing",
    position_group: "Bar",
    standard_result: "Bar ditutup sesuai SOP: bersih, mesin off, stok diamankan.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "21:00",
    target_time_end: "22:00",
    sort_order: 5,
    checklist: [
      "Backflush / bilas mesin sesuai SOP",
      "Grinder dimatikan / dibersihkan",
      "Susu dan bahan perishable disimpan",
      "Area bar bersih dan kering",
      "Listrik / gas non-esensial dimatikan",
      "Sampah dibuang",
    ],
  },
  // —— Dapur (5) ——
  {
    id: "RTPL-D01",
    title: "Opening Dapur",
    category: "Opening",
    position_group: "Dapur",
    standard_result: "Dapur siap produksi: bersih, peralatan siap, suhu cold storage OK.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "07:00",
    target_time_end: "08:00",
    sort_order: 1,
    checklist: [
      "Area dapur bersih sebelum mulai",
      "Peralatan utama siap pakai",
      "Kompor / oven dicek",
      "Chiller / freezer suhu normal",
      "Bahan opening tersedia di stasiun",
      "Tangan / apron / kebersihan personal OK",
    ],
  },
  {
    id: "RTPL-D02",
    title: "Cek Bahan Siap Jual",
    category: "Stock",
    position_group: "Dapur",
    standard_result: "Bahan siap jual cukup, layak, tidak expired / busuk.",
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "08:00",
    target_time_end: "09:00",
    sort_order: 2,
    checklist: [
      "Stok menu utama cukup untuk service",
      "Tidak ada bahan busuk / bau tidak wajar",
      "Label tanggal / FIFO dipatuhi",
      "Item hampir habis dicatat",
      "Bumbu / sauce stasiun lengkap",
    ],
  },
  {
    id: "RTPL-D03",
    title: "Produksi Bahan Harian",
    category: "Production",
    position_group: "Dapur",
    standard_result: "Produksi harian selesai sesuai target, disimpan dengan benar.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "09:00",
    target_time_end: "11:00",
    sort_order: 3,
    checklist: [
      "Produksi sesuai daftar harian",
      "Porsi / takaran sesuai resep",
      "Hasil disimpan di wadah bersih berlabel",
      "Suhu penyimpanan sesuai standar",
      "Area produksi dibersihkan setelah selesai",
    ],
  },
  {
    id: "RTPL-D04",
    title: "Cek Chiller / Freezer",
    category: "Maintenance",
    position_group: "Dapur",
    standard_result: "Chiller & freezer dingin sesuai standar, rapi, tidak bau.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "12:00",
    target_time_end: "13:00",
    sort_order: 4,
    checklist: [
      "Suhu chiller dalam rentang aman",
      "Suhu freezer dalam rentang aman",
      "Pintu menutup rapat",
      "Tidak ada bau busuk",
      "Barang tersusun rapi / tidak overfill",
      "Tidak ada kebocoran / es berlebih abnormal",
    ],
  },
  {
    id: "RTPL-D05",
    title: "Closing Dapur",
    category: "Closing",
    position_group: "Dapur",
    standard_result: "Dapur bersih, sampah dibuang, api/listrik aman, siap esok hari.",
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "21:00",
    target_time_end: "22:00",
    sort_order: 5,
    checklist: [
      "Peralatan dicuci dan disimpan",
      "Kompor / oven dimatikan",
      "Area dapur dipel / disapu",
      "Sampah dapur dibuang",
      "Bahan disimpan kembali ke cold storage",
      "Listrik non-esensial dimatikan",
    ],
  },
  // —— Quick kendala (semua posisi) ——
  {
    id: "RTPL-K01",
    title: "Lapor Kendala Operasional",
    category: "Kendala",
    position_group: "", // will set null
    outlet_id: null,
    standard_result: "Kendala tercatat jelas agar leader bisa follow up.",
    requires_photo: false,
    is_required_daily: false,
    kind: "issue_quick",
    sort_order: 99,
    checklist: [
      "Jenis kendala sudah dipilih di status kondisi",
      "Lokasi / area kendala sudah jelas di catatan",
      "Foto diambil jika relevan (opsional)",
    ],
  },
]);

// Fix empty position_group for kendala template
const kendalaTpl = seedTemplates.find((t) => t.id === "RTPL-K01");
if (kendalaTpl) kendalaTpl.position_group = null;

const seedTokenBudi =
  "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00";
const seedTokenRina =
  "b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011";
const seedTokenAni =
  "c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122";

type StoreState = {
  links: StaffReportLink[];
  templates: ReportTemplate[];
  checklistItems: ReportTemplateChecklistItem[];
  submissions: DailyReportSubmission[];
  answers: DailyReportChecklistAnswer[];
  staffCache: Staff[];
};

const globalKey = "__nusa_staff_report_store_v2__";

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
        {
          id: "SRL-002",
          staff_id: "STF-003",
          token: seedTokenRina,
          is_active: true,
          created_at: nowISO(),
          revoked_at: null,
        },
        {
          id: "SRL-003",
          staff_id: "STF-002",
          token: seedTokenAni,
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
  const staff = findStaff(link.staff_id);
  return {
    ...link,
    staff_name: staff?.name,
    outlet: staff?.outlet,
    position: staff?.position,
    report_url: `${origin || ""}/r/${link.token}`,
  };
}

export function listStaffReportLinks(origin?: string): StaffReportLink[] {
  return getState().links.map((l) => enrichLink(l, origin));
}

export function getLinkByToken(token: string): StaffReportLink | undefined {
  return getState().links.find((l) => l.token === token);
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
  condition?: ReportConditionStatus | null
): DailyReportRowLabel {
  if (!isRequired && !submitted) return "tidak_wajib";
  if (!submitted) return "belum_submit";
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
        submission?.status_condition
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

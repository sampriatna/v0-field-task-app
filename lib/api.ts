import type {
  Task,
  CreateTaskPayload,
  SubmitReportPayload,
  TaskFilters,
  DashboardSummary,
  ApiResponse,
  RecurringTemplate,
  CreateRecurringTemplatePayload,
  UpdateRecurringTemplatePayload,
  ChecklistReport,
  SubmitChecklistPayload,
  ChecklistSummary,
  ChecklistItem,
  Staff,
  CreateStaffPayload,
  UpdateStaffPayload,
  UserLogin,
  CreateUserPayload,
  UpdateUserPayload,
} from "./types";
import { 
  mockTasks, 
  mockDashboardSummary, 
  mockRecurringTemplates, 
  mockChecklistReports, 
  mockChecklistSummary,
  mockChecklistItems,
  areas as mockAreas,
  categories as mockCategories,
} from "./mock-data";

// Internal API endpoint - no longer expose GAS URL directly
const API_BASE = "/api/gas";

// Robust normalizer untuk berbagai format response dari GAS
function normalizeTaskList(data: unknown): Task[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Task[];
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.tasks)) return obj.tasks as Task[];
    if (Array.isArray(obj.data)) return obj.data as Task[];
    if (Array.isArray(obj.rows)) return obj.rows as Task[];
    if (Array.isArray(obj.items)) return obj.items as Task[];
  }
  return [];
}

// Normalize staff data from GAS (maps staff_name -> name, is_active -> status, etc.)
function normalizeStaffFromGAS(gasStaff: Record<string, unknown>): Staff {
  return {
    staff_id: String(gasStaff.staff_id || ""),
    name: String(gasStaff.staff_name || gasStaff.name || ""),
    position: String(gasStaff.position || ""),
    outlet: (gasStaff.outlet || "KBU") as Staff["outlet"],
    area: (gasStaff.area || "Dapur") as Staff["area"],
    wa_number: String(gasStaff.wa_number || ""),
    role: (gasStaff.role || "STAFF") as Staff["role"],
    status: gasStaff.is_active === "TRUE" || gasStaff.is_active === true || gasStaff.is_active === "ACTIVE" || gasStaff.status === "ACTIVE" || gasStaff.active_status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
    created_at: String(gasStaff.created_at || ""),
    updated_at: String(gasStaff.last_updated || gasStaff.updated_at || ""),
  };
}

// Normalize staff list from GAS response
function normalizeStaffList(data: unknown): Staff[] {
  if (!data) return [];
  
  let rawList: Record<string, unknown>[] = [];
  
  if (Array.isArray(data)) {
    rawList = data as Record<string, unknown>[];
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.staff)) rawList = obj.staff as Record<string, unknown>[];
    else if (Array.isArray(obj.data)) rawList = obj.data as Record<string, unknown>[];
    else if (Array.isArray(obj.rows)) rawList = obj.rows as Record<string, unknown>[];
  }
  
  return rawList.map(normalizeStaffFromGAS);
}

// Convert frontend staff payload to GAS format
function staffPayloadToGAS(payload: CreateStaffPayload | UpdateStaffPayload): Record<string, unknown> {
  const gasPayload: Record<string, unknown> = {
    staff_name: payload.name,
    wa_number: payload.wa_number,
    outlet: payload.outlet,
    role: payload.role,
    // Optional fields - only include if they exist
  };
  
  if ("staff_id" in payload) {
    gasPayload.staff_id = payload.staff_id;
  }
  
  // Include position and area if GAS supports them
  if (payload.position) gasPayload.position = payload.position;
  if (payload.area) gasPayload.area = payload.area;
  
  return gasPayload;
}

// Pick the first non-empty value from a list of possible field names
function pickField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

// Coerce various truthy representations from GAS into a boolean
function coerceChecked(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    return v === "TRUE" || v === "1" || v === "YES" || v === "Y" || v === "CHECKED" || v === "DONE" || v === "✓";
  }
  return false;
}

// Normalize a single checked item from GAS (field names vary)
function normalizeCheckedItem(raw: Record<string, unknown>): ChecklistReportItem {
  const photo = pickField(raw, ["photo_url", "photoUrl", "photo", "image_url", "imageUrl", "photo_link", "url"]);
  return {
    checklist_item_id: String(
      pickField(raw, ["checklist_item_id", "checklistItemId", "item_id", "itemId", "id"]) || ""
    ),
    is_checked: coerceChecked(
      pickField(raw, ["is_checked", "isChecked", "checked", "is_done", "done", "status", "value"])
    ),
    photo_url: photo ? String(photo) : undefined,
  };
}

// Extract the checked items array from various GAS response shapes
function normalizeCheckedItems(data: unknown): ChecklistReportItem[] {
  if (!data) return [];
  let rawList: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    rawList = data as Record<string, unknown>[];
  } else if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.checked_items)) rawList = obj.checked_items as Record<string, unknown>[];
    else if (Array.isArray(obj.checkedItems)) rawList = obj.checkedItems as Record<string, unknown>[];
    else if (Array.isArray(obj.items)) rawList = obj.items as Record<string, unknown>[];
    else if (Array.isArray(obj.report_items)) rawList = obj.report_items as Record<string, unknown>[];
  }
  return rawList.map(normalizeCheckedItem);
}

// Normalize a single checklist template item from GAS (field names vary)
function normalizeChecklistItem(raw: Record<string, unknown>, index: number): ChecklistItem {
  // active_status defaults to TRUE unless GAS explicitly says otherwise
  const activeRaw = pickField(raw, ["active_status", "activeStatus", "active", "is_active", "isActive"]);
  const activeStatus = activeRaw === undefined ? true : coerceChecked(activeRaw);

  return {
    checklist_item_id: String(
      pickField(raw, ["checklist_item_id", "checklistItemId", "item_id", "itemId", "id"]) || `ITEM-${index + 1}`
    ),
    template_id: String(pickField(raw, ["template_id", "templateId"]) || ""),
    item_order: Number(pickField(raw, ["item_order", "itemOrder", "order", "no", "urutan"]) ?? index + 1),
    item_text: String(
      pickField(raw, ["item_text", "itemText", "text", "title", "name", "description", "item"]) || ""
    ),
    requires_photo: coerceChecked(
      pickField(raw, ["requires_photo", "requiresPhoto", "require_photo", "need_photo", "photo_required", "wajib_foto"])
    ),
    is_required: (() => {
      const r = pickField(raw, ["is_required", "isRequired", "required", "wajib", "mandatory"]);
      return r === undefined ? true : coerceChecked(r);
    })(),
    active_status: activeStatus,
  };
}

// Extract and normalize the template items array from various GAS shapes
function normalizeChecklistItems(data: unknown): ChecklistItem[] {
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((item, i) => normalizeChecklistItem(item, i));
}

// Normalize a full checklist report from GAS, mapping varying field names
function normalizeChecklistReport(data: unknown): ChecklistReport | null {
  if (!data || typeof data !== "object") return null;

  // Unwrap common envelope keys
  const root = data as Record<string, unknown>;
  const obj = (
    (root.report && typeof root.report === "object" && (root.report as Record<string, unknown>).task_id && root.report) ||
    (root.checklist && typeof root.checklist === "object" && root.checklist) ||
    (root.data && typeof root.data === "object" && !Array.isArray(root.data) && root.data) ||
    root
  ) as Record<string, unknown>;

  // Normalize the template items list (field names vary across GAS sheets)
  const itemsRaw = pickField(obj, ["items", "checklist_items", "checklistItems", "template_items", "templateItems"]);
  const items = normalizeChecklistItems(itemsRaw);

  // checked_items may live under several keys, or be merged into items
  const checkedItems = normalizeCheckedItems(
    pickField(obj, ["checked_items", "checkedItems", "report_items", "reportItems", "results"]) ?? obj
  );

  const afterPhoto = pickField(obj, [
    "after_photo_url", "afterPhotoUrl", "after_photo", "afterPhoto", "result_photo_url", "final_photo_url",
  ]);

  return {
    report_id: String(pickField(obj, ["report_id", "reportId", "id"]) || ""),
    task_id: String(pickField(obj, ["task_id", "taskId"]) || ""),
    template_id: String(pickField(obj, ["template_id", "templateId"]) || ""),
    token: String(pickField(obj, ["token"]) || ""),
    pic_name: String(pickField(obj, ["pic_name", "picName", "staff_name", "pic"]) || ""),
    pic_wa: String(pickField(obj, ["pic_wa", "picWa", "wa_number", "wa"]) || ""),
    outlet: (pickField(obj, ["outlet"]) || "") as ChecklistReport["outlet"],
    area: (pickField(obj, ["area"]) || "") as ChecklistReport["area"],
    report_date: String(pickField(obj, ["report_date", "reportDate", "date"]) || ""),
    deadline: String(pickField(obj, ["deadline", "due_date", "dueDate"]) || ""),
    checklist_title: String(
      pickField(obj, ["checklist_title", "checklistTitle", "title", "template_name", "task_name"]) || ""
    ),
    items,
    submitted_at: pickField(obj, ["submitted_at", "submittedAt"]) ? String(pickField(obj, ["submitted_at", "submittedAt"])) : undefined,
    checked_items: checkedItems,
    after_photo_url: afterPhoto ? String(afterPhoto) : undefined,
    staff_note: pickField(obj, ["staff_note", "staffNote", "note"]) ? String(pickField(obj, ["staff_note", "staffNote", "note"])) : undefined,
    status: (pickField(obj, ["status"]) || "OPEN") as ChecklistReport["status"],
    verified_by: pickField(obj, ["verified_by", "verifiedBy"]) ? String(pickField(obj, ["verified_by", "verifiedBy"])) : undefined,
    verified_at: pickField(obj, ["verified_at", "verifiedAt"]) ? String(pickField(obj, ["verified_at", "verifiedAt"])) : undefined,
    revision_note: pickField(obj, ["revision_note", "revisionNote"]) ? String(pickField(obj, ["revision_note", "revisionNote"])) : undefined,
    revision_count: Number(pickField(obj, ["revision_count", "revisionCount"]) || 0),
    is_late: coerceChecked(pickField(obj, ["is_late", "isLate", "late"])),
  };
}

// Build the correct staff report link for the frontend route /report/[taskId]?token=
export function buildReportLink(taskId: string, token: string, origin?: string): string {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/report/${taskId}?token=${token}`;
}

async function callApi<T>(
  action: string,
  payload?: Record<string, unknown>,
  method: "GET" | "POST" = "POST"
): Promise<ApiResponse<T>> {
  try {
    let response: Response;

    if (method === "GET") {
      const params = new URLSearchParams({ action, ...payload } as Record<string, string>);
      response = await fetch(`${API_BASE}?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } else {
      response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, ...payload }),
      });
    }

    // Handle 401 - redirect to login
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return { success: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    // Handle payload too large (e.g. uncompressed photos exceeding the body limit).
    // The platform returns plain text like "Request Entity Too Large", which is NOT
    // valid JSON, so we must check this before attempting to parse.
    if (response.status === 413) {
      return {
        success: false,
        error: "Foto terlalu besar untuk dikirim. Coba ambil ulang foto, lalu kirim lagi.",
      };
    }

    // Read as text first so a non-JSON response (HTML error page, plain-text
    // gateway error, etc.) doesn't throw a cryptic "Unexpected token" error.
    const responseText = await response.text();

    let result: ApiResponse<T> & { message?: string };
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("[v0] Non-JSON response from API:", responseText.slice(0, 300));
      return {
        success: false,
        error:
          "Server mengembalikan respons yang tidak valid. Coba lagi; jika berlanjut, hubungi leader.",
      };
    }

    // GAS returns { success, data, message, error }
    // We pass it through directly since it matches our ApiResponse structure
    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: false, error: "GAS_NOT_CONFIGURED" };
    }

    // Check for GAS errors
    if (!result.success && result.error) {
      return { success: false, error: result.error };
    }

    // Defensive: GAS returned a falsy `success` but NO `error` field.
    // Never let this bubble up as a blank error screen — surface a usable
    // message (prefer GAS `message`) and log the raw payload for diagnosis.
    if (!result.success) {
      console.error("[v0] API returned success=false without error. Raw:", responseText.slice(0, 500));
      return {
        success: false,
        error:
          result.message ||
          `Server menolak permintaan "${action}" tanpa pesan. Coba lagi; jika berlanjut, hubungi leader.`,
      };
    }

    // Return the GAS response directly - data is already in the right place
    return { success: result.success, data: result.data as T };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan saat menghubungi server",
    };
  }
}

// Simulate network delay for mock data
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createTask(payload: CreateTaskPayload): Promise<ApiResponse<Task>> {
  try {
    const result = await callApi<Task>("createTask", payload as unknown as Record<string, unknown>);

    if (result.error === "GAS_NOT_CONFIGURED") {
      // Mock response
      await delay(1000);
      const newTask: Task = {
        task_id: `TSK-${String(Date.now()).slice(-6)}`,
        token: Math.random().toString(36).substring(2, 15),
        created_at: new Date().toISOString(),
        created_by: "Admin",
        ...payload,
        status: "OPEN",
        report_link: "",
        is_late: false,
        last_updated: new Date().toISOString(),
      };
      newTask.report_link = `/report/${newTask.task_id}?token=${newTask.token}`;
      return { success: true, data: newTask };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat tugas",
    };
  }
}

export async function getTaskByToken(
  taskId: string,
  token: string
): Promise<ApiResponse<Task>> {
  try {
    // GAS does not expose a "getTaskByToken" action. The public "getTaskDetail"
    // action validates the staff token and returns the full task, so we use it.
    const result = await callApi<Task>(
      "getTaskDetail",
      { task_id: taskId, token },
      "GET"
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      const task = mockTasks.find((t) => t.task_id === taskId && t.token === token);
      if (task) {
        return { success: true, data: task };
      }
      return { success: false, error: "Link tugas tidak valid" };
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error:
          "Link tugas tidak valid atau token salah. Hubungi leader.",
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil data tugas",
    };
  }
}

export async function markOpened(taskId: string, token: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("markOpened", { task_id: taskId, token });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(200);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menandai tugas dibuka",
    };
  }
}

export async function submitTaskReport(
  payload: SubmitReportPayload
): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>(
      "submitTaskReport",
      payload as unknown as Record<string, unknown>
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1500);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim laporan",
    };
  }
}

export async function getTasks(filters?: TaskFilters): Promise<ApiResponse<Task[]>> {
  try {
    const result = await callApi<unknown>(
      "getTasks",
      filters as unknown as Record<string, unknown>,
      "GET"
    );

    // GAS not configured → show mock data so app still works without GAS
    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(300);
      let tasks = [...mockTasks];
      if (filters?.outlet) tasks = tasks.filter((t) => t.outlet === filters.outlet);
      if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
      if (filters?.pic) tasks = tasks.filter((t) =>
        t.pic_name.toLowerCase().includes(filters.pic!.toLowerCase())
      );
      return { success: true, data: tasks };
    }

    // GAS returned a real error (not network) — surface it to the UI
    if (!result.success && result.error) {
      return { success: false, error: result.error };
    }

    if (result.success && result.data !== undefined) {
      const list = normalizeTaskList(result.data);
      return { success: true, data: list };
    }

    return { success: true, data: [] };
  } catch {
    // Network failure — fallback to mock
    await delay(300);
    let tasks = [...mockTasks];
    if (filters?.outlet) tasks = tasks.filter((t) => t.outlet === filters.outlet);
    if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
    return { success: true, data: tasks };
  }
}

export async function getTaskDetail(taskId: string): Promise<ApiResponse<Task>> {
  try {
    // GAS getTaskDetail requires the staff token, which the admin UI does not
    // have from the URL alone. Instead, fetch the full task list (admin-scoped)
    // and find the matching task — it already contains all fields we need.
    const result = await getTasks();

    if (result.success && result.data) {
      const task = result.data.find((t) => t.task_id === taskId);
      if (task) {
        return { success: true, data: task };
      }
      return { success: false, error: "Tugas tidak ditemukan" };
    }

    return {
      success: false,
      error: result.error || "Gagal mengambil detail tugas",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail tugas",
    };
  }
}

export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  try {
    const result = await callApi<DashboardSummary>("getDashboardSummary", undefined, "GET");

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(300);
      return { success: true, data: mockDashboardSummary };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil summary",
    };
  }
}

export async function verifyTask(
  taskId: string,
  status: "approved" | "revision",
  note?: string
): Promise<ApiResponse<void>> {
  try {
    const action = status === "approved" ? "verifyTask" : "requestRevision";
    const result = await callApi<void>(action, { 
      task_id: taskId, 
      revision_note: note  // GAS expects revision_note field
    });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(800);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memverifikasi tugas",
    };
  }
}

export async function resendWhatsApp(taskId: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("resendWhatsApp", { task_id: taskId });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim ulang WhatsApp",
    };
  }
}

// =============================================
// RECURRING TEMPLATE API FUNCTIONS
// =============================================

export async function getRecurringTemplates(): Promise<ApiResponse<RecurringTemplate[]>> {
  try {
    const result = await callApi<RecurringTemplate[]>("getRecurringTemplates", undefined, "GET");
    // Only fall back to mock when GAS is not configured at all
    if (result.error === "GAS_NOT_CONFIGURED") return { success: true, data: mockRecurringTemplates };
    if (!result.success) return { success: false, error: result.error || "Gagal mengambil template" };
    return { success: true, data: result.data ?? [] };
  } catch {
    return { success: true, data: mockRecurringTemplates };
  }
}

export async function getRecurringTemplate(templateId: string): Promise<ApiResponse<RecurringTemplate>> {
  try {
    const result = await callApi<RecurringTemplate>("getRecurringTemplate", { template_id: templateId }, "GET");
    if (result.error === "GAS_NOT_CONFIGURED") {
      const template = mockRecurringTemplates.find(t => t.template_id === templateId);
      return template ? { success: true, data: template } : { success: false, error: "Template tidak ditemukan" };
    }
    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Template tidak ditemukan" };
    }
    return { success: true, data: result.data };
  } catch {
    const template = mockRecurringTemplates.find(t => t.template_id === templateId);
    return template ? { success: true, data: template } : { success: false, error: "Template tidak ditemukan" };
  }
}

export async function createRecurringTemplate(
  payload: CreateRecurringTemplatePayload
): Promise<ApiResponse<RecurringTemplate>> {
  try {
    const result = await callApi<RecurringTemplate>(
      "createRecurringTemplate",
      payload as unknown as Record<string, unknown>
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      const newTemplate: RecurringTemplate = {
        template_id: `REC-${String(Date.now()).slice(-6)}`,
        ...payload,
        active_status: true,
        template_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { success: true, data: newTemplate };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat template berulang",
    };
  }
}

export async function updateRecurringTemplate(
  payload: UpdateRecurringTemplatePayload
): Promise<ApiResponse<RecurringTemplate>> {
  try {
    const result = await callApi<RecurringTemplate>(
      "updateRecurringTemplate",
      payload as unknown as Record<string, unknown>
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      const existingTemplate = mockRecurringTemplates.find(t => t.template_id === payload.template_id);
      const updatedTemplate: RecurringTemplate = {
        ...payload,
        active_status: true,
        template_version: (existingTemplate?.template_version || 0) + 1,
        created_at: existingTemplate?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { success: true, data: updatedTemplate };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengupdate template",
    };
  }
}

export async function toggleRecurringTemplateStatus(
  templateId: string,
  active: boolean
): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("toggleRecurringTemplateStatus", { 
      template_id: templateId, 
      active 
    });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengubah status template",
    };
  }
}

// =============================================
// CHECKLIST TEMPLATE API FUNCTIONS
// =============================================

export async function getChecklistItems(templateId: string): Promise<ApiResponse<ChecklistItem[]>> {
  try {
    const result = await callApi<ChecklistItem[]>("getChecklistItems", { template_id: templateId }, "GET");
    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: true, data: mockChecklistItems.filter(i => i.template_id === templateId) };
    }
    if (!result.success) return { success: false, error: result.error || "Gagal mengambil checklist items" };
    return { success: true, data: result.data ?? [] };
  } catch {
    return { success: true, data: mockChecklistItems.filter(i => i.template_id === templateId) };
  }
}

export async function saveChecklistItems(
  templateId: string,
  items: Omit<ChecklistItem, "checklist_item_id" | "template_id">[]
): Promise<ApiResponse<ChecklistItem[]>> {
  try {
    const result = await callApi<ChecklistItem[]>("saveChecklistItems", {
      template_id: templateId,
      items,
    });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(800);
      const savedItems: ChecklistItem[] = items.map((item, index) => ({
        ...item,
        checklist_item_id: `CHK-${templateId}-${String(index + 1).padStart(2, "0")}`,
        template_id: templateId,
      }));
      return { success: true, data: savedItems };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan item checklist",
    };
  }
}

// =============================================
// CHECKLIST REPORT API FUNCTIONS
// =============================================

export async function getChecklistByToken(
  taskId: string,
  token: string
): Promise<ApiResponse<ChecklistReport>> {
  try {
    const result = await callApi<ChecklistReport>(
      "getChecklistByToken",
      { task_id: taskId, token },
      "GET"
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      const report = mockChecklistReports.find(
        (r) => r.task_id === taskId && r.token === token
      );
      if (report) {
        return { success: true, data: report };
      }
      return { success: false, error: "Link checklist tidak valid" };
    }

    if (!result.success) {
      return { success: false, error: result.error || "Link checklist tidak valid" };
    }

    if (!result.data) {
      return { success: false, error: "Link checklist tidak valid atau sudah kedaluwarsa" };
    }

    // Pre-process: merge task fields into root so normalizer finds deadline/outlet/items
    if (result.data && typeof result.data === 'object') {
      const d = result.data as Record<string, unknown>;
      if (d.task && typeof d.task === 'object') {
        Object.assign(d, d.task as Record<string, unknown>);
      }
    }

    // GAS field names vary — normalize so items, photos, status map correctly
    const normalized = normalizeChecklistReport(result.data);
    if (!normalized) {
      return {
        success: false,
        error: "Link checklist tidak valid atau sudah kedaluwarsa",
      };
    }

    return { success: true, data: normalized };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil checklist",
    };
  }
}

export async function submitChecklistReport(
  payload: SubmitChecklistPayload
): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>(
      "submitChecklistReport",
      payload as unknown as Record<string, unknown>
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1500);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim laporan checklist",
    };
  }
}

export async function generateChecklistReport(templateId: string): Promise<ApiResponse<{ task?: { task_id: string } }>> {
  try {
    const result = await callApi<{ task?: { task_id: string } }>("generateChecklistReport", {
      template_id: templateId,
    });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      return {
        success: true,
        data: { task: { task_id: `CHK-${templateId}-${Date.now()}` } },
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal membuat checklist report",
    };
  }
}

export async function getChecklistReports(
  filters?: { outlet?: string; status?: string }
): Promise<ApiResponse<ChecklistReport[]>> {
  try {
    const result = await callApi<ChecklistReport[]>(
      "getChecklistReports",
      filters as unknown as Record<string, unknown>,
      "GET"
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      let reports = [...mockChecklistReports];
      if (filters?.outlet) reports = reports.filter((r) => r.outlet === filters.outlet);
      if (filters?.status) reports = reports.filter((r) => r.status === filters.status);
      return { success: true, data: reports };
    }

    if (!result.success) return { success: false, error: result.error || "Gagal mengambil checklist reports" };
    return { success: true, data: result.data ?? [] };
  } catch {
    return { success: true, data: mockChecklistReports };
  }
}

export async function getChecklistDetail(taskId: string): Promise<ApiResponse<ChecklistReport>> {
  try {
    const result = await callApi<ChecklistReport>("getChecklistDetail", { task_id: taskId }, "GET");
    if (result.error === "GAS_NOT_CONFIGURED") {
      const report = mockChecklistReports.find((r) => r.task_id === taskId);
      return report ? { success: true, data: report } : { success: false, error: "Checklist tidak ditemukan" };
    }
    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Checklist tidak ditemukan" };
    }
    // GAS field names vary — normalize so checked_items, photos, etc. map correctly
    const normalized = normalizeChecklistReport(result.data);
    if (!normalized) {
      return { success: false, error: "Format data checklist tidak valid" };
    }
    return { success: true, data: normalized };
  } catch {
    const report = mockChecklistReports.find((r) => r.task_id === taskId);
    return report ? { success: true, data: report } : { success: false, error: "Checklist tidak ditemukan" };
  }
}

export async function getChecklistSummary(): Promise<ApiResponse<ChecklistSummary>> {
  try {
    const result = await callApi<ChecklistSummary>("getChecklistSummary", undefined, "GET");

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(300);
      return { success: true, data: mockChecklistSummary };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil summary checklist",
    };
  }
}

export async function verifyChecklist(
  taskId: string,
  status: "approved" | "revision",
  note?: string
): Promise<ApiResponse<void>> {
  try {
    const action = status === "approved" ? "approveChecklist" : "requestChecklistRevision";
    const result = await callApi<void>(action, { 
      task_id: taskId, 
      revision_note: note  // GAS expects revision_note field
    });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(800);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memverifikasi checklist",
    };
  }
}

export async function resendChecklistWhatsApp(taskId: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("resendChecklistWhatsApp", { task_id: taskId });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim ulang WhatsApp checklist",
    };
  }
}

// =============================================
// STAFF MASTER API FUNCTIONS
// =============================================

// Mock staff data for fallback
const mockStaff: Staff[] = [
  {
    staff_id: "STF-001",
    name: "Budi Santoso",
    position: "Cook",
    outlet: "KBU",
    area: "Dapur",
    wa_number: "6281234567890",
    role: "STAFF",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getStaff(filters?: { outlet?: string; status?: string }): Promise<ApiResponse<Staff[]>> {
  try {
    const result = await callApi<unknown>("getStaff", filters as Record<string, string>, "GET");

    // GAS not configured → silent fallback to mock
    if (result.error === "GAS_NOT_CONFIGURED") {
      let staff = [...mockStaff];
      if (filters?.outlet) staff = staff.filter(s => s.outlet === filters.outlet);
      if (filters?.status) staff = staff.filter(s => s.status === filters.status);
      return { success: true, data: staff };
    }

    // GAS returned a real error
    if (!result.success && result.error) {
      return { success: false, error: result.error };
    }

    if (result.success && result.data) {
      const normalized = normalizeStaffList(result.data);
      let filtered = normalized;
      if (filters?.outlet) filtered = filtered.filter(s => s.outlet === filters.outlet);
      if (filters?.status) filtered = filtered.filter(s => s.status === filters.status);
      return { success: true, data: filtered };
    }

    return { success: true, data: [] };
  } catch {
    return { success: true, data: mockStaff };
  }
}

export async function createStaff(payload: CreateStaffPayload): Promise<ApiResponse<Staff>> {
  try {
    // Convert frontend field names to GAS field names
    const gasPayload = staffPayloadToGAS(payload);
    const result = await callApi<Record<string, unknown>>("createStaff", gasPayload);

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      const newStaff: Staff = {
        staff_id: `STF-${String(Date.now()).slice(-6)}`,
        ...payload,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { success: true, data: newStaff };
    }

    // Normalize response from GAS
    if (result.success && result.data) {
      return { success: true, data: normalizeStaffFromGAS(result.data) };
    }

    return { success: false, error: result.error || "Gagal menambah staff" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menambah staff",
    };
  }
}

export async function updateStaff(payload: UpdateStaffPayload): Promise<ApiResponse<Staff>> {
  try {
    // Convert frontend field names to GAS field names
    const gasPayload = staffPayloadToGAS(payload);
    const result = await callApi<Record<string, unknown>>("updateStaff", gasPayload);

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(1000);
      const updatedStaff: Staff = {
        ...payload,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { success: true, data: updatedStaff };
    }

    // Normalize response from GAS
    if (result.success && result.data) {
      return { success: true, data: normalizeStaffFromGAS(result.data) };
    }

    return { success: false, error: result.error || "Gagal mengupdate staff" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengupdate staff",
    };
  }
}

export async function deactivateStaff(staffId: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("deactivateStaff", { staff_id: staffId });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menonaktifkan staff",
    };
  }
}

export async function activateStaff(staffId: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("activateStaff", { staff_id: staffId });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengaktifkan staff",
    };
  }
}

// =============================================
// USER LOGIN MANAGEMENT (GAS v26)
// =============================================

export async function getUsers(): Promise<ApiResponse<UserLogin[]>> {
  try {
    const result = await callApi<unknown>("getUsers", {});
    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: true, data: [] };
    }
    if (result.success && result.data) {
      const raw = Array.isArray(result.data)
        ? result.data
        : Array.isArray((result.data as Record<string, unknown>).users)
        ? ((result.data as Record<string, unknown>).users as unknown[])
        : Array.isArray((result.data as Record<string, unknown>).data)
        ? ((result.data as Record<string, unknown>).data as unknown[])
        : null;
      if (raw) return { success: true, data: raw as UserLogin[] };
    }
    return { success: true, data: [] };
  } catch {
    return { success: true, data: [] };
  }
}

export async function createUser(payload: CreateUserPayload): Promise<ApiResponse<UserLogin>> {
  try {
    const result = await callApi<UserLogin>("createUser", payload as unknown as Record<string, unknown>);

    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: false, error: "GAS belum dikonfigurasi. Hubungi administrator." };
    }

    if (result.success && result.data) return { success: true, data: result.data };
    return { success: false, error: result.error || "Gagal membuat user" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal membuat user" };
  }
}

export async function updateUser(payload: UpdateUserPayload): Promise<ApiResponse<UserLogin>> {
  try {
    const result = await callApi<UserLogin>("updateUser", payload as unknown as Record<string, unknown>);

    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: false, error: "GAS belum dikonfigurasi. Hubungi administrator." };
    }

    if (result.success && result.data) return { success: true, data: result.data };
    return { success: false, error: result.error || "Gagal mengupdate user" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal mengupdate user" };
  }
}

export async function deleteUser(userId: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("deleteUser", { user_id: userId });

    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: false, error: "GAS belum dikonfigurasi. Hubungi administrator." };
    }

    if (result.success) return { success: true };
    return { success: false, error: result.error || "Gagal menghapus user" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus user" };
  }
}

// =============================================
// AREA & CATEGORY MANAGEMENT
// =============================================

// Normalize area/category item — GAS may return objects or plain strings
function normalizeStringItem(
  item: unknown,
  nameKeys: string[]
): string | null {
  if (typeof item === "string" && item.trim()) return item.trim();
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const key of nameKeys) {
      if (typeof obj[key] === "string" && (obj[key] as string).trim()) {
        return (obj[key] as string).trim();
      }
    }
  }
  return null;
}

export async function getAreas(): Promise<ApiResponse<string[]>> {
  try {
    const result = await callApi<unknown>("getAreas", {});

    if (result.error === "GAS_NOT_CONFIGURED") return { success: true, data: mockAreas };
    if (!result.success && result.error) return { success: false, error: result.error };

    if (result.success && result.data) {
      const raw = Array.isArray(result.data)
        ? result.data
        : Array.isArray((result.data as Record<string, unknown>).areas)
        ? ((result.data as Record<string, unknown>).areas as unknown[])
        : Array.isArray((result.data as Record<string, unknown>).data)
        ? ((result.data as Record<string, unknown>).data as unknown[])
        : null;

      if (raw) {
        const normalized = raw
          .map((item) => normalizeStringItem(item, ["area_name", "name", "area"]))
          .filter((s): s is string => s !== null);
        if (normalized.length > 0) return { success: true, data: normalized };
      }
    }

    return { success: true, data: mockAreas };
  } catch {
    return { success: true, data: mockAreas };
  }
}

export async function createArea(name: string): Promise<ApiResponse<string>> {
  try {
    const result = await callApi<Record<string, unknown>>("createArea", { name });
    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true, data: name };
    }
    if (result.success) {
      return { success: true, data: (result.data?.area || result.data?.data || name) as string };
    }
    return { success: false, error: result.error || "Gagal menambah area" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menambah area" };
  }
}

export async function deleteArea(name: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("deleteArea", { name });
    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(300);
      return { success: true };
    }
    if (result.success) return { success: true };
    return { success: false, error: result.error || "Gagal menghapus area" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus area" };
  }
}

export async function getCategories(): Promise<ApiResponse<string[]>> {
  try {
    const result = await callApi<unknown>("getCategories", {});

    if (result.error === "GAS_NOT_CONFIGURED") return { success: true, data: mockCategories };
    if (!result.success && result.error) return { success: false, error: result.error };

    if (result.success && result.data) {
      const raw = Array.isArray(result.data)
        ? result.data
        : Array.isArray((result.data as Record<string, unknown>).categories)
        ? ((result.data as Record<string, unknown>).categories as unknown[])
        : Array.isArray((result.data as Record<string, unknown>).data)
        ? ((result.data as Record<string, unknown>).data as unknown[])
        : null;

      if (raw) {
        const normalized = raw
          .map((item) => normalizeStringItem(item, ["category_name", "name", "category"]))
          .filter((s): s is string => s !== null);
        if (normalized.length > 0) return { success: true, data: normalized };
      }
    }

    return { success: true, data: mockCategories };
  } catch {
    return { success: true, data: mockCategories };
  }
}

export async function createCategory(name: string): Promise<ApiResponse<string>> {
  try {
    const result = await callApi<Record<string, unknown>>("createCategory", { name });
    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true, data: name };
    }
    if (result.success) {
      return { success: true, data: (result.data?.category || result.data?.data || name) as string };
    }
    return { success: false, error: result.error || "Gagal menambah kategori" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menambah kategori" };
  }
}

export async function deleteCategory(name: string): Promise<ApiResponse<void>> {
  try {
    const result = await callApi<void>("deleteCategory", { name });
    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(300);
      return { success: true };
    }
    if (result.success) return { success: true };
    return { success: false, error: result.error || "Gagal menghapus kategori" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus kategori" };
  }
}

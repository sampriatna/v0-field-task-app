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
  if (!data) {
    console.log("[v0] normalizeTaskList: data is null/undefined, returning empty");
    return [];
  }
  
  // Jika sudah array, return langsung
  if (Array.isArray(data)) {
    console.log("[v0] normalizeTaskList: direct array, count:", data.length);
    return data as Task[];
  }
  
  // Jika object, cari task di berbagai key
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    
    if (Array.isArray(obj.tasks)) {
      console.log("[v0] normalizeTaskList: found in .tasks, count:", obj.tasks.length);
      return obj.tasks as Task[];
    }
    if (Array.isArray(obj.data)) {
      console.log("[v0] normalizeTaskList: found in .data, count:", obj.data.length);
      return obj.data as Task[];
    }
    if (Array.isArray(obj.rows)) {
      console.log("[v0] normalizeTaskList: found in .rows, count:", obj.rows.length);
      return obj.rows as Task[];
    }
    if (Array.isArray(obj.items)) {
      console.log("[v0] normalizeTaskList: found in .items, count:", obj.items.length);
      return obj.items as Task[];
    }
    
    console.log("[v0] normalizeTaskList: object has no array fields, keys:", Object.keys(obj));
  }
  
  console.log("[v0] normalizeTaskList: no array found, returning empty");
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
    status: gasStaff.is_active === "TRUE" || gasStaff.is_active === true || gasStaff.is_active === "ACTIVE" || gasStaff.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
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

    const result = await response.json();
    
    // GAS returns { success, data, message, error }
    // We pass it through directly since it matches our ApiResponse structure
    if (result.error === "GAS_NOT_CONFIGURED") {
      return { success: false, error: "GAS_NOT_CONFIGURED" };
    }

    // Check for GAS errors
    if (!result.success && result.error) {
      return { success: false, error: result.error };
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
    console.log("[v0] getTasks: loading with filters:", filters ? Object.keys(filters) : "none");
    
    const result = await callApi<unknown>(
      "getTasks",
      filters as unknown as Record<string, unknown>,
      "GET"
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
      console.log("[v0] getTasks: GAS not configured, using mock data");
      await delay(500);
      let tasks = [...mockTasks];

      if (filters?.outlet) {
        tasks = tasks.filter((t) => t.outlet === filters.outlet);
      }
      if (filters?.status) {
        tasks = tasks.filter((t) => t.status === filters.status);
      }
      if (filters?.pic) {
        tasks = tasks.filter((t) =>
          t.pic_name.toLowerCase().includes(filters.pic!.toLowerCase())
        );
      }

      console.log("[v0] getTasks: mock data count:", tasks.length);
      return { success: true, data: tasks };
    }

    if (result.success && result.data !== undefined) {
      const list = normalizeTaskList(result.data);
      console.log("[v0] getTasks: success, normalized count:", list.length);
      return { success: true, data: list };
    }

    console.log("[v0] getTasks: error:", result.error);
    return { success: false, error: result.error };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.log("[v0] getTasks: exception:", errorMsg);
    return {
      success: false,
      error: errorMsg || "Gagal mengambil daftar tugas",
    };
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

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true, data: mockRecurringTemplates };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil template berulang",
    };
  }
}

export async function getRecurringTemplate(templateId: string): Promise<ApiResponse<RecurringTemplate>> {
  try {
    const result = await callApi<RecurringTemplate>("getRecurringTemplate", { template_id: templateId }, "GET");

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(300);
      const template = mockRecurringTemplates.find(t => t.template_id === templateId);
      if (template) {
        return { success: true, data: template };
      }
      return { success: false, error: "Template tidak ditemukan" };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil template",
    };
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
      await delay(300);
      const items = mockChecklistItems.filter(i => i.template_id === templateId);
      return { success: true, data: items };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil item checklist",
    };
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

    return result;
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
      await delay(500);
      let reports = [...mockChecklistReports];

      if (filters?.outlet) {
        reports = reports.filter((r) => r.outlet === filters.outlet);
      }
      if (filters?.status) {
        reports = reports.filter((r) => r.status === filters.status);
      }

      return { success: true, data: reports };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil daftar checklist",
    };
  }
}

export async function getChecklistDetail(taskId: string): Promise<ApiResponse<ChecklistReport>> {
  try {
    const result = await callApi<ChecklistReport>("getChecklistDetail", { task_id: taskId }, "GET");

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      const report = mockChecklistReports.find((r) => r.task_id === taskId);
      if (report) {
        return { success: true, data: report };
      }
      return { success: false, error: "Checklist tidak ditemukan" };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail checklist",
    };
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

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      let staff = [...mockStaff];
      if (filters?.outlet) {
        staff = staff.filter(s => s.outlet === filters.outlet);
      }
      if (filters?.status) {
        staff = staff.filter(s => s.status === filters.status);
      }
      return { success: true, data: staff };
    }

    // Normalize response using the staff normalizer
    if (result.success && result.data) {
      const normalized = normalizeStaffList(result.data);
      
      // Apply filters if needed (in case GAS doesn't filter)
      let filtered = normalized;
      if (filters?.outlet) {
        filtered = filtered.filter(s => s.outlet === filters.outlet);
      }
      if (filters?.status) {
        filtered = filtered.filter(s => s.status === filters.status);
      }
      
      return { success: true, data: filtered };
    }

    return { success: true, data: [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil daftar staff",
    };
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
// AREA & CATEGORY MANAGEMENT
// =============================================

export async function getAreas(): Promise<ApiResponse<string[]>> {
  try {
    const result = await callApi<unknown>("getAreas", {});

    if (result.success && result.data) {
      if (Array.isArray(result.data)) return { success: true, data: result.data as string[] };
      if (typeof result.data === "object") {
        const obj = result.data as Record<string, unknown>;
        if (Array.isArray(obj.areas)) return { success: true, data: obj.areas as string[] };
        if (Array.isArray(obj.data)) return { success: true, data: obj.data as string[] };
      }
    }

    // GAS not configured or action returned no usable data — use fallback
    return { success: true, data: mockAreas };
  } catch {
    return { success: true, data: mockAreas };
  }
}

export async function createArea(name: string): Promise<ApiResponse<string>> {
  try {
    const result = await callApi<{ area?: string; data?: string }>("createArea", { name });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true, data: name };
    }

    if (result.success && result.data) {
      return { success: true, data: (result.data.area || result.data.data || name) as string };
    }

    return { success: false, error: result.error || "Gagal menambah area" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menambah area" };
  }
}

export async function getCategories(): Promise<ApiResponse<string[]>> {
  try {
    const result = await callApi<unknown>("getCategories", {});

    if (result.success && result.data) {
      if (Array.isArray(result.data)) return { success: true, data: result.data as string[] };
      if (typeof result.data === "object") {
        const obj = result.data as Record<string, unknown>;
        if (Array.isArray(obj.categories)) return { success: true, data: obj.categories as string[] };
        if (Array.isArray(obj.data)) return { success: true, data: obj.data as string[] };
      }
    }

    // GAS not configured or action returned no usable data — use fallback
    return { success: true, data: mockCategories };
  } catch {
    return { success: true, data: mockCategories };
  }
}

export async function createCategory(name: string): Promise<ApiResponse<string>> {
  try {
    const result = await callApi<{ category?: string; data?: string }>("createCategory", { name });

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      return { success: true, data: name };
    }

    if (result.success && result.data) {
      return { success: true, data: (result.data.category || result.data.data || name) as string };
    }

    return { success: false, error: result.error || "Gagal menambah kategori" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal menambah kategori" };
  }
}

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
} from "./types";
import { 
  mockTasks, 
  mockDashboardSummary, 
  mockRecurringTemplates, 
  mockChecklistReports, 
  mockChecklistSummary,
  mockChecklistItems,
} from "./mock-data";

// Internal API endpoint - no longer expose GAS URL directly
const API_BASE = "/api/gas";

// GAS can return the task list in several shapes. Normalize them all to an array.
function normalizeTaskList(data: unknown): Task[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Task[];
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.tasks)) return obj.tasks as Task[];
    if (Array.isArray(obj.rows)) return obj.rows as Task[];
    if (Array.isArray(obj.items)) return obj.items as Task[];
    if (Array.isArray(obj.data)) return obj.data as Task[];
  }
  return [];
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
    const result = await callApi<unknown>(
      "getTasks",
      filters as unknown as Record<string, unknown>,
      "GET"
    );

    if (result.error === "GAS_NOT_CONFIGURED") {
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

      return { success: true, data: tasks };
    }

    if (result.success) {
      const list = normalizeTaskList(result.data);
      console.log("[v0] getTasks count:", list.length);
      return { success: true, data: list };
    }

    return { success: false, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil daftar tugas",
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
    const result = await callApi<void>(action, { task_id: taskId, note });

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
    const result = await callApi<void>(action, { task_id: taskId, note });

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

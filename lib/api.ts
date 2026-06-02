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

const GAS_URL_KEY = "nusa_gas_web_app_url";
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbz7VvBRsFg-6Nkfc-P1zqRAHB1T7xjcA2z3b-TShsKicZIz1NqmDJ2hnvxDWOx_YzM/exec";

function getGasUrl(): string {
  if (typeof window === "undefined") return DEFAULT_GAS_URL;
  return localStorage.getItem(GAS_URL_KEY) || DEFAULT_GAS_URL;
}

export function setGasUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GAS_URL_KEY, url);
  }
}

export function getStoredGasUrl(): string {
  return getGasUrl();
}

function isGasConfigured(): boolean {
  const url = getGasUrl();
  return url.includes("script.google.com") && !url.includes("PASTE_GAS_URL_HERE");
}

async function callGas<T>(
  action: string,
  payload?: Record<string, unknown>,
  method: "GET" | "POST" = "POST"
): Promise<ApiResponse<T>> {
  const url = getGasUrl();

  if (!isGasConfigured()) {
    // Return mock data if GAS is not configured
    return { success: false, error: "GAS_NOT_CONFIGURED" };
  }

  try {
    let response: Response;

    if (method === "GET") {
      const params = new URLSearchParams({ action, ...payload } as Record<string, string>);
      response = await fetch(`${url}?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } else {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("GAS API Error:", error);
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
    const result = await callGas<Task>("createTask", payload as unknown as Record<string, unknown>);

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
    const result = await callGas<Task>(
      "getTaskByToken",
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
    const result = await callGas<void>("markOpened", { task_id: taskId, token });

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
    const result = await callGas<void>(
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
    const result = await callGas<Task[]>(
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

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil daftar tugas",
    };
  }
}

export async function getTaskDetail(taskId: string): Promise<ApiResponse<Task>> {
  try {
    const result = await callGas<Task>("getTaskDetail", { task_id: taskId }, "GET");

    if (result.error === "GAS_NOT_CONFIGURED") {
      await delay(500);
      const task = mockTasks.find((t) => t.task_id === taskId);
      if (task) {
        return { success: true, data: task };
      }
      return { success: false, error: "Tugas tidak ditemukan" };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail tugas",
    };
  }
}

export async function getDashboardSummary(): Promise<ApiResponse<DashboardSummary>> {
  try {
    const result = await callGas<DashboardSummary>("getDashboardSummary", undefined, "GET");

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
    const result = await callGas<void>(action, { task_id: taskId, note });

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
    const result = await callGas<void>("resendWhatsApp", { task_id: taskId });

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
    const result = await callGas<RecurringTemplate[]>("getRecurringTemplates", undefined, "GET");

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
    const result = await callGas<RecurringTemplate>("getRecurringTemplate", { template_id: templateId }, "GET");

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
    const result = await callGas<RecurringTemplate>(
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
    const result = await callGas<RecurringTemplate>(
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
    const result = await callGas<void>("toggleRecurringTemplateStatus", { 
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
    const result = await callGas<ChecklistItem[]>("getChecklistItems", { template_id: templateId }, "GET");

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
    const result = await callGas<ChecklistItem[]>("saveChecklistItems", {
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
    const result = await callGas<ChecklistReport>(
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
    const result = await callGas<void>(
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
    const result = await callGas<ChecklistReport[]>(
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
    const result = await callGas<ChecklistReport>("getChecklistDetail", { task_id: taskId }, "GET");

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
    const result = await callGas<ChecklistSummary>("getChecklistSummary", undefined, "GET");

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
    const result = await callGas<void>(action, { task_id: taskId, note });

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
    const result = await callGas<void>("resendChecklistWhatsApp", { task_id: taskId });

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

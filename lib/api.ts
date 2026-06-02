import type {
  Task,
  CreateTaskPayload,
  SubmitReportPayload,
  TaskFilters,
  DashboardSummary,
  ApiResponse,
} from "./types";
import { mockTasks, mockDashboardSummary } from "./mock-data";

const GAS_URL_KEY = "nusa_gas_web_app_url";
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/PASTE_GAS_URL_HERE/exec";

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
  return url !== DEFAULT_GAS_URL && url.includes("script.google.com");
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

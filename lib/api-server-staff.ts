import type { ApiResponse, Staff } from "./types";

/**
 * Server-side staff fetch for API routes.
 * Uses GAS when configured; otherwise returns empty so the store seed is used.
 */
export async function getStaff(): Promise<ApiResponse<Staff[]>> {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!gasUrl || !adminApiKey) {
    return { success: true, data: [] };
  }

  try {
    const params = new URLSearchParams({
      action: "getStaff",
      admin_secret: adminApiKey,
      api_key: adminApiKey,
    });
    const response = await fetch(`${gasUrl}?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await response.text();
    let result: { success?: boolean; data?: unknown; error?: string };
    try {
      result = JSON.parse(text);
    } catch {
      return { success: false, error: "GAS response invalid" };
    }

    if (!result.success) {
      return { success: false, error: result.error || "Gagal mengambil staff" };
    }

    const raw = result.data;
    let list: Record<string, unknown>[] = [];
    if (Array.isArray(raw)) {
      list = raw as Record<string, unknown>[];
    } else if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.staff)) list = obj.staff as Record<string, unknown>[];
      else if (Array.isArray(obj.data)) list = obj.data as Record<string, unknown>[];
      else if (Array.isArray(obj.rows)) list = obj.rows as Record<string, unknown>[];
    }

    const staff: Staff[] = list.map((gasStaff) => ({
      staff_id: String(gasStaff.staff_id || ""),
      name: String(gasStaff.staff_name || gasStaff.name || ""),
      position: String(gasStaff.position || ""),
      outlet: (gasStaff.outlet || "KBU") as Staff["outlet"],
      area: (gasStaff.area || "Dapur") as Staff["area"],
      wa_number: String(gasStaff.wa_number || ""),
      role: (gasStaff.role || "STAFF") as Staff["role"],
      status:
        gasStaff.is_active === "TRUE" ||
        gasStaff.is_active === true ||
        gasStaff.is_active === "ACTIVE" ||
        gasStaff.status === "ACTIVE" ||
        gasStaff.active_status === "ACTIVE"
          ? "ACTIVE"
          : "INACTIVE",
      created_at: String(gasStaff.created_at || ""),
      updated_at: String(gasStaff.last_updated || gasStaff.updated_at || ""),
    }));

    return { success: true, data: staff.filter((s) => s.staff_id) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil staff",
    };
  }
}

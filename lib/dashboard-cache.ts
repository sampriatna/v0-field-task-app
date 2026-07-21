/**
 * Cache ringan untuk dashboard — paint instan, lalu revalidate di background.
 * Hanya di browser (sessionStorage).
 */

import type { Task, ChecklistReport } from "@/lib/types";

const CACHE_KEY = "nusa_dashboard_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit dianggap "segar"

export type DashboardCachePayload = {
  tasks: Task[];
  checklists: ChecklistReport[];
  saved_at: number;
};

export function readDashboardCache(): DashboardCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DashboardCachePayload;
    if (!data || !Array.isArray(data.tasks)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeDashboardCache(
  tasks: Task[],
  checklists: ChecklistReport[]
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: DashboardCachePayload = {
      tasks,
      checklists,
      saved_at: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota penuh / private mode — abaikan
  }
}

export function isDashboardCacheFresh(cache: DashboardCachePayload | null): boolean {
  if (!cache?.saved_at) return false;
  return Date.now() - cache.saved_at < CACHE_TTL_MS;
}

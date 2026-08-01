import type { ApiResponse } from "./types";

/** Pesan standar saat GAS tidak tersedia — jangan tampilkan data mock. */
export const GAS_UNAVAILABLE_MSG =
  "Backend belum dikonfigurasi atau tidak dapat dihubungi. Hubungi administrator.";

/**
 * Mock GAS hanya jika explicitly diizinkan (dev lokal tanpa GAS).
 * Set ALLOW_GAS_MOCK=true di .env.local — default OFF.
 */
export function allowGasMockFallback(): boolean {
  return process.env.ALLOW_GAS_MOCK === "true";
}

export function gasUnavailable<T>(): ApiResponse<T> {
  return { success: false, error: GAS_UNAVAILABLE_MSG };
}

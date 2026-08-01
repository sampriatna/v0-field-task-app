import type { SessionPayload } from "./auth";

const DAILY_ACTIVITY_ADMIN_ROLES = new Set(["OWNER", "ADMIN", "LEADER"]);

/**
 * Daily Activity admin routes: owner, ADMIN, or LEADER only.
 * Public submit/by-token routes are not gated here.
 */
export function canAccessDailyActivityAdmin(
  session: SessionPayload | null
): boolean {
  if (!session || !session.isAdmin) return false;
  const role = (session.userRole || "owner").trim().toUpperCase();
  if (role === "OWNER") return true;
  return DAILY_ACTIVITY_ADMIN_ROLES.has(role);
}

export function dailyActivityAdminDeniedResponse() {
  return {
    success: false as const,
    error: "Akses ditolak. Hanya admin atau leader yang boleh mengelola Daily Activity.",
    code: "FORBIDDEN" as const,
  };
}

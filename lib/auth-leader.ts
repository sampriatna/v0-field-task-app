// Leader/Multi-user authentication utilities
// Stores leader session in localStorage instead of single admin password

import type { LeaderSession } from "./types";

const LEADER_SESSION_KEY = "leader_session_v0";
const ADMIN_PASSWORD_KEY = "admin_password_session";

export function getLeaderSession(): LeaderSession | null {
  if (typeof window === "undefined") return null;
  
  const session = localStorage.getItem(LEADER_SESSION_KEY);
  if (!session) return null;
  
  try {
    return JSON.parse(session) as LeaderSession;
  } catch {
    return null;
  }
}

export function setLeaderSession(session: LeaderSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEADER_SESSION_KEY, JSON.stringify(session));
}

export function clearLeaderSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEADER_SESSION_KEY);
}

export function isLeaderLoggedIn(): boolean {
  const session = getLeaderSession();
  return session !== null && session.staff_id !== undefined;
}

// Admin session
export function getAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_PASSWORD_KEY) === "true";
}

export function setAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_PASSWORD_KEY, "true");
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_PASSWORD_KEY);
}

export function isAdminLoggedIn(): boolean {
  return getAdminSession();
}

export function isLoggedIn(): boolean {
  return isAdminLoggedIn() || isLeaderLoggedIn();
}

export function clearAllSessions(): void {
  clearAdminSession();
  clearLeaderSession();
}

// Get current user info (either admin or leader)
export function getCurrentUserInfo(): { type: "admin" | "leader"; data?: LeaderSession } | null {
  if (isAdminLoggedIn()) {
    return { type: "admin" };
  }
  
  const leaderSession = getLeaderSession();
  if (leaderSession) {
    return { type: "leader", data: leaderSession };
  }
  
  return null;
}

// Validate PIN format (4-6 digits)
export function isValidPIN(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

// Generate secure PIN
export function generatePIN(): string {
  return String(Math.floor(Math.random() * 999999)).padStart(4, "0");
}

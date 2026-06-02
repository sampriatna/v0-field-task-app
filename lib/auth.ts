import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "nusa_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  isAdmin: boolean;
  loginAt: number;
  expiresAt: number;
}

export async function createSession(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION * 1000;
  
  const token = await new SignJWT({
    isAdmin: true,
    loginAt: Date.now(),
    expiresAt,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt / 1000)
    .sign(getSecretKey());

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    
    if (
      typeof payload.isAdmin !== "boolean" ||
      typeof payload.loginAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    // Check if session has expired
    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return {
      isAdmin: payload.isAdmin,
      loginAt: payload.loginAt,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return null;
  }

  return verifySession(sessionCookie.value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set");
    return false;
  }

  console.log("[v0] Password validation - input length:", password.length, "expected length:", adminPassword.length);
  console.log("[v0] Match result:", password === adminPassword);
  
  return password === adminPassword;
}

export function isAuthenticated(session: SessionPayload | null): boolean {
  return session !== null && session.isAdmin === true;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "nusa_session";

// Routes that require admin authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/tasks/new",
  "/tasks/", // /tasks/[taskId]
  "/recurring",
  "/settings",
  "/checklists/", // /checklists/[taskId] - admin view
  "/checklist-template/", // /checklist-template/[templateId]
  "/master/",
];

// Routes that are always public
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/report/", // /report/[taskId]?token=...
  "/checklist/", // /checklist/[taskId]?token=... - staff view
  "/r/", // /r/[token] - staff static daily report link
  "/api/auth/",
  "/api/gas", // Will be secured at the API level
  "/api/staff-reports/by-token/", // public token lookup
  "/api/staff-reports/submit", // public daily report submit
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    if (route.endsWith("/")) {
      return pathname.startsWith(route) || pathname === route.slice(0, -1);
    }
    return pathname === route || pathname.startsWith(route + "/");
  });
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route.endsWith("/")) {
      return pathname.startsWith(route) || pathname === route.slice(0, -1);
    }
    return pathname === route || pathname.startsWith(route + "/");
  });
}

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      return false;
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    // Check if session is valid and not expired
    if (
      typeof payload.isAdmin !== "boolean" ||
      typeof payload.expiresAt !== "number" ||
      !payload.isAdmin ||
      payload.expiresAt < Date.now()
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check protected routes
  if (isProtectedRoute(pathname)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      // Redirect to login if no session
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const isValid = await verifySessionToken(sessionCookie.value);

    if (!isValid) {
      // Clear invalid session and redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

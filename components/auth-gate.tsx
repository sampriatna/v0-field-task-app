"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const SESSION_COOKIE_NAME = "nusa_session";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/tasks/new",
  "/tasks/",
  "/recurring",
  "/settings",
  "/checklists/",
  "/checklist-template/",
  "/master/",
];

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/report/",
  "/checklist/",
  "/r/",
  "/api/auth/",
  "/api/gas",
  "/api/staff-reports/by-token/",
  "/api/staff-reports/submit",
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

function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));
}

/** Client-side route guard — replaces proxy.ts to avoid Vercel deploy failures on Next.js 16. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.includes(".")
    ) {
      return;
    }

    if (isPublicRoute(pathname) || !isProtectedRoute(pathname)) {
      return;
    }

    if (checkedRef.current === pathname) return;

    if (!hasSessionCookie()) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
      return;
    }

    checkedRef.current = pathname;

    fetch("/api/auth/check", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { authenticated?: boolean }) => {
        if (!data.authenticated) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      });
  }, [pathname, router]);

  return <>{children}</>;
}

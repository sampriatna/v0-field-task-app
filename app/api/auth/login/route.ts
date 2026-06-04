import { NextResponse } from "next/server";
import { createSession, validateAdminPassword } from "@/lib/auth";

const SESSION_COOKIE_NAME = "nusa_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password harus diisi" },
        { status: 400 }
      );
    }

    // --- Mode 1: Admin login via ADMIN_PASSWORD (owner / single-password legacy) ---
    if (!username || username.trim() === "") {
      if (!validateAdminPassword(password)) {
        return NextResponse.json(
          { success: false, error: "Password salah" },
          { status: 401 }
        );
      }
      const token = await createSession({ userRole: "owner", userName: "Admin" });
      const response = NextResponse.json({ success: true, role: "owner", name: "Admin" });
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION,
      });
      return response;
    }

    // --- Mode 2: Staff / Leader login via GAS validateLogin ---
    const gasUrl = process.env.GAS_WEB_APP_URL;
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (!gasUrl || !adminApiKey) {
      // Fallback: try admin password so app still works without GAS
      if (validateAdminPassword(password)) {
        const token = await createSession({ userRole: "owner", userName: username });
        const response = NextResponse.json({ success: true, role: "owner", name: username });
        response.cookies.set(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_DURATION,
        });
        return response;
      }
      return NextResponse.json(
        { success: false, error: "Konfigurasi server tidak lengkap" },
        { status: 500 }
      );
    }

    const gasBody = {
      action: "validateLogin",
      username: username.trim(),
      password,
      admin_secret: adminApiKey,
      api_key: adminApiKey,
    };

    let gasOk = false;
    let gasUser: { staff_id?: string; name?: string; role?: string; outlet?: string } = {};

    try {
      const gasRes = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gasBody),
      });
      const gasData = await gasRes.json();
      if (gasData.success && gasData.data) {
        gasOk = true;
        gasUser = gasData.data as typeof gasUser;
      }
    } catch {
      // GAS unreachable — fallback to admin password
    }

    if (!gasOk) {
      // Fallback: allow owner login via ADMIN_PASSWORD even with username present
      if (validateAdminPassword(password)) {
        const token = await createSession({ userRole: "owner", userName: username });
        const response = NextResponse.json({ success: true, role: "owner", name: username });
        response.cookies.set(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_DURATION,
        });
        return response;
      }
      return NextResponse.json(
        { success: false, error: "Username atau password salah" },
        { status: 401 }
      );
    }

    const token = await createSession({
      userId: gasUser.staff_id,
      userName: gasUser.name || username,
      userRole: gasUser.role || "STAFF",
      userOutlet: gasUser.outlet,
    });

    const response = NextResponse.json({
      success: true,
      role: gasUser.role || "STAFF",
      name: gasUser.name || username,
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat login" },
      { status: 500 }
    );
  }
}

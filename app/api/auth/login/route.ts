import { NextResponse } from "next/server";
import { createSession, validateAdminPassword } from "@/lib/auth";

const SESSION_COOKIE_NAME = "nusa_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password harus diisi" },
        { status: 400 }
      );
    }

    if (!validateAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: "Password salah" },
        { status: 401 }
      );
    }

    // Create session token
    const token = await createSession();
    
    // Create response with cookie
    const response = NextResponse.json({ success: true });
    
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

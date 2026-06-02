import { NextResponse } from "next/server";
import { createSession, setSessionCookie, validateAdminPassword } from "@/lib/auth";

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
    
    // Set secure httpOnly cookie
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat login" },
      { status: 500 }
    );
  }
}

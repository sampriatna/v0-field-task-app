import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    
    return NextResponse.json({
      authenticated: session !== null && session.isAdmin === true,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

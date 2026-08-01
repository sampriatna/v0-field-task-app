import { NextResponse } from "next/server";
import { DailyActivityStorageError } from "./daily-activity-db";

export function dailyActivityStorageErrorResponse(error: unknown): NextResponse {
  if (error instanceof DailyActivityStorageError) {
    if (error.code === "NOT_CONFIGURED") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "STORAGE_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message, code: "STORAGE_ERROR" },
      { status: 500 }
    );
  }
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan pada storage Daily Activity.";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

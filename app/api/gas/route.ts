import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";

// Actions that require admin authentication
const ADMIN_ACTIONS = [
  "createTask",
  "getTasks",
  "getTaskDetail",
  "verifyTask",
  "requestRevision",
  "resendWhatsApp",
  "getRecurringTemplates",
  "getRecurringTemplate",
  "createRecurringTemplate",
  "updateRecurringTemplate",
  "toggleRecurringTemplateStatus",
  "getChecklistItems",
  "saveChecklistItems",
  "getChecklistReports",
  "getChecklistDetail",
  "getChecklistSummary",
  "approveChecklist",
  "requestChecklistRevision",
  "resendChecklistWhatsApp",
  "getDashboardSummary",
  "createOutlet",
  "updateOutlet",
  "deleteOutlet",
  "getOutlets",
  "createArea",
  "updateArea",
  "deleteArea",
  "getAreas",
  "createCategory",
  "updateCategory",
  "deleteCategory",
  "getCategories",
  "createStaff",
  "updateStaff",
  "deleteStaff",
  "getStaff",
];

// Actions that are public (staff report pages)
const PUBLIC_ACTIONS = [
  "healthCheck",
  "getTaskByToken",
  "markOpened",
  "submitTaskReport",
  "getChecklistByToken",
  "submitChecklistReport",
];

function isAdminAction(action: string): boolean {
  return ADMIN_ACTIONS.includes(action);
}

function isPublicAction(action: string): boolean {
  return PUBLIC_ACTIONS.includes(action);
}

async function forwardToGas(
  action: string,
  payload: Record<string, unknown>,
  method: "GET" | "POST",
  includeAdminSecret: boolean
): Promise<Response> {
  const gasUrl = process.env.GAS_WEB_APP_URL;

  if (!gasUrl) {
    return NextResponse.json(
      { success: false, error: "GAS_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  // Add admin secret for admin actions
  const finalPayload = includeAdminSecret
    ? { ...payload, admin_secret: process.env.ADMIN_API_KEY }
    : payload;

  try {
    let response: Response;

    if (method === "GET") {
      const params = new URLSearchParams({ 
        action, 
        ...Object.fromEntries(
          Object.entries(finalPayload).map(([k, v]) => [k, String(v)])
        )
      });
      response = await fetch(`${gasUrl}?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } else {
      response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...finalPayload }),
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GAS API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghubungi server" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (!action) {
    return NextResponse.json(
      { success: false, error: "Action is required" },
      { status: 400 }
    );
  }

  // Check if action is allowed
  if (!isPublicAction(action) && !isAdminAction(action)) {
    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400 }
    );
  }

  // Check authentication for admin actions
  if (isAdminAction(action)) {
    const session = await getSession();
    if (!isAuthenticated(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // Build payload from search params (excluding action)
  const payload: Record<string, unknown> = {};
  searchParams.forEach((value, key) => {
    if (key !== "action") {
      payload[key] = value;
    }
  });

  return forwardToGas(action, payload, "GET", isAdminAction(action));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 }
      );
    }

    // Check if action is allowed
    if (!isPublicAction(action) && !isAdminAction(action)) {
      return NextResponse.json(
        { success: false, error: "Unknown action" },
        { status: 400 }
      );
    }

    // Check authentication for admin actions
    if (isAdminAction(action)) {
      const session = await getSession();
      if (!isAuthenticated(session)) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    return forwardToGas(action, payload, "POST", isAdminAction(action));
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

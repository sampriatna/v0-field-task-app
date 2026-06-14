import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth";

// Actions that require admin authentication
const ADMIN_ACTIONS = [
  "createTask",
  "getTasks",
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
  "deactivateStaff",
  "activateStaff",
  "getStaff",
  "deleteTask",
  "getChecklistTemplate",
  "saveChecklistTemplate",
  "generateRecurringTasks",
  "loginUser",
  "getUsers",
  "createUser",
  "updateUser",
  "deleteUser",
  "getChecklistTemplates",
  "createChecklistTemplate",
  "updateChecklistTemplate",
  "getChecklistItems",
  "saveChecklistItems",
  "generateChecklistReport",
  "getChecklistReports",
  "getChecklistDetail",
  "getChecklistByToken",
  "submitChecklistReport",
  "approveChecklist",
  "requestChecklistRevision",
  "resendChecklistWhatsApp",
];

// Actions that are public (staff report pages) - no LOGIN needed, but still need admin_secret for GAS
const PUBLIC_ACTIONS = [
  "healthCheck",
  "getTaskByToken",
  "getTaskDetail",
  "markOpened",
  "submitTaskReport",
  "getChecklistByToken",
  "submitChecklistReport",
];

// All non-healthCheck actions need admin_secret for GAS
function needsAdminSecret(action: string): boolean {
  return action !== "healthCheck";
}

function isPublicAction(action: string): boolean {
  return PUBLIC_ACTIONS.includes(action);
}

function isAdminAction(action: string): boolean {
  // Public actions (staff report pages) must NEVER require login,
  // even if they also appear in ADMIN_ACTIONS. Public takes precedence.
  if (isPublicAction(action)) return false;
  return ADMIN_ACTIONS.includes(action);
}

async function forwardToGas(
  action: string,
  payload: Record<string, unknown>,
  method: "GET" | "POST",
  includeAdminSecret: boolean
): Promise<Response> {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!gasUrl) {
    return NextResponse.json(
      { success: false, error: "GAS_NOT_CONFIGURED" },
      { status: 500 }
    );
  }

  // Build final payload - add admin_secret only for admin actions
  const finalPayload: Record<string, unknown> = { ...payload };
  
  if (includeAdminSecret) {
    if (!adminApiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: "ADMIN_API_KEY tidak dikonfigurasi di server",
          debug: {
            hasAdminApiKey: false,
            action,
            isAdminAction: true,
            forwardedWithAdminSecret: false,
          }
        },
        { status: 500 }
      );
    }
    // GAS requires both admin_secret and api_key fields
    finalPayload.admin_secret = adminApiKey;
    finalPayload.api_key = adminApiKey;
  }

  try {
    let response: Response;

    if (method === "GET") {
      // Build query params - include action and all payload fields
      const params = new URLSearchParams();
      params.set("action", action);
      
      // Add admin_secret to query params for GET requests if needed
      for (const [key, value] of Object.entries(finalPayload)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
      
      const fullUrl = `${gasUrl}?${params.toString()}`;
      
      response = await fetch(fullUrl, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
        },
      });
    } else {
      // POST request - send action in body along with payload
      const bodyData = {
        action,
        ...finalPayload,
      };
      
      response = await fetch(gasUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });
    }

    // Get response text first to handle non-JSON responses
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      
      // If GAS returns ADMIN_SECRET_INVALID, add debug info
      if (data.error === "ADMIN_SECRET_INVALID" || responseText.includes("ADMIN_SECRET_INVALID")) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Admin API key tidak valid atau tidak cocok dengan GAS",
            debug: {
              hasAdminApiKey: !!adminApiKey,
              adminApiKeyLength: adminApiKey ? adminApiKey.length : 0,
              action,
              isAdminAction: includeAdminSecret,
              forwardedWithAdminSecret: includeAdminSecret,
            }
          },
          { status: 401 }
        );
      }
      
      return NextResponse.json(data);
    } catch {
      // Response is not valid JSON
      console.error("GAS returned non-JSON response:", responseText.substring(0, 500));
      
      // Check for common GAS error patterns
      if (responseText.includes("Script function not found")) {
        return NextResponse.json(
          { success: false, error: `Action "${action}" tidak ditemukan di GAS` },
          { status: 400 }
        );
      }
      
      if (responseText.includes("ADMIN_SECRET_INVALID")) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Admin API key tidak valid",
            debug: {
              hasAdminApiKey: !!adminApiKey,
              action,
              isAdminAction: includeAdminSecret,
              forwardedWithAdminSecret: includeAdminSecret,
            }
          },
          { status: 401 }
        );
      }
      
      // Return detailed debug info for non-JSON responses
      return NextResponse.json(
        { 
          success: false, 
          message: "Response dari GAS bukan JSON valid",
          status: response.status,
          contentType: response.headers.get("content-type"),
          rawPreview: responseText.slice(0, 500),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("GAS API Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghubungi server GAS" },
      { status: 500 }
    );
  }
}

// GET handler
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
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  }

  // Check authentication for admin actions
  if (isAdminAction(action)) {
    const session = await getSession();
    if (!isAuthenticated(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - login required" },
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

  // Forward to GAS - include admin_secret for all non-healthCheck actions
  return forwardToGas(action, payload, "GET", needsAdminSecret(action));
}

// POST handler
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
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    // Check authentication for admin actions
    if (isAdminAction(action)) {
      const session = await getSession();
      if (!isAuthenticated(session)) {
        return NextResponse.json(
          { success: false, error: "Unauthorized - login required" },
          { status: 401 }
        );
      }
    }

    // Forward to GAS - include admin_secret for all non-healthCheck actions
    return forwardToGas(action, payload, "POST", needsAdminSecret(action));
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

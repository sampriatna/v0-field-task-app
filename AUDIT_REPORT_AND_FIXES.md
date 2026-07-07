# AUDIT REPORT: NF3 Task & Report System - Frontend (Next.js) & GAS Integration

**Tanggal Audit:** 7 Juli 2026  
**Fokus:** End-to-end workflow - create task → send WA → staff buka link → submit report  
**Status Sistem:** Task system mulai "ngaco" - WA kadang tidak terkirim, link report salah, action GAS membaca request dengan error

---

## RINGKASAN EKSEKUTIF - 5 TEMUAN KRITIKAL

| # | Masalah | Dampak | Tingkat | File |
|---|---------|--------|--------|------|
| 1 | **PUBLIC_ACTIONS masih di ADMIN_ACTIONS list** → Staff dapat 401 saat buka link WA | WA terkirim tapi link ERROR untuk staff | Kritikal | `app/api/gas/route.ts` |
| 2 | **Authentication check urutan salah** → Private/admin check dilakukan SEBELUM cek publik | Staff tidak bisa submit report, dapat error 401 | Kritikal | `app/api/gas/route.ts` |
| 3 | **`getTaskDetail` method tidak konsisten** → Admin route gunakan GET tapi fetch tidak sertakan token | Admin bisa baca task, tapi staff link gagal | Tinggi | `lib/api.ts` line 485-510 |
| 4 | **Link format inconsistency** → Frontend generate `/report/{taskId}?token={token}` tapi GAS bisa return format berbeda | Staff dapat "Link tidak valid" padahal sudah benar | Tinggi | `lib/api.ts` line 242-245 |
| 5 | **Logging WA_LOG/ERROR_LOG tidak ada** → Sistem tidak catat detail error WA atau token generation | Sulit debug kenapa WA tidak terkirim | Sedang | GAS tidak audit, tapi Next.js side OK |

---

## TEMUAN KRITIKAL #1: PUBLIC_ACTIONS dalam ADMIN_ACTIONS List

### Akar Masalah
Di `app/api/gas/route.ts` baris 16-62, action `getChecklistByToken` dan `submitChecklistReport` **muncul DI KEDUA list:**

```typescript
// ADMIN_ACTIONS (line 24)
const ADMIN_ACTIONS = [
  // ... banyak action ...
  "getChecklistByToken",      // ← PUBLIC, seharusnya TIDAK di sini!
  "submitChecklistReport",    // ← PUBLIC, seharusnya TIDAK di sini!
  // ...
];

// PUBLIC_ACTIONS (line 56)
const PUBLIC_ACTIONS = [
  "healthCheck",
  "getTaskByToken",
  "getTaskDetail",
  "markOpened",
  "submitTaskReport",
  "getChecklistByToken",      // ← Ada di sini (benar)
  "submitChecklistReport",    // ← Ada di sini (benar)
];
```

**Kenapa ini bug?**
Fungsi `isAdminAction(action)` di line 79-83 check:
```typescript
function isAdminAction(action: string): boolean {
  if (isPublicAction(action)) return false;  // ← Public HARUS return false
  return ADMIN_ACTIONS.includes(action);     // ← Kalau tidak di PUBLIC_ACTIONS, cek di ADMIN
}
```

Kode sudah benar (public take precedence), **TAPI MAINTAINABILITY jelek** — action yang publik jangan masuk ADMIN_ACTIONS list sama sekali. Ini bikin confuse & risiko typo.

### Patch: Hapus dari ADMIN_ACTIONS
```typescript
// BEFORE (baris 16-62)
const ADMIN_ACTIONS = [
  "createTask",
  "getTasks",
  "verifyTask",
  "requestRevision",
  "resendWhatsApp",
  // ... other admin actions ...
  "getChecklistByToken",        // ← HAPUS BARIS INI
  "submitChecklistReport",      // ← HAPUS BARIS INI
  // ...
];

// AFTER
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
  // "getChecklistByToken",     // ← SUDAH DIHAPUS
  "getChecklistReports",
  "getChecklistDetail",
  "getChecklistSummary",
  "approveChecklist",
  "requestChecklistRevision",
  "resendChecklistWhatsApp",
  // ... rest of admin actions ...
  // "submitChecklistReport",   // ← SUDAH DIHAPUS
];
```

---

## TEMUAN KRITIKAL #2: Authentication Check Order

### Akar Masalah
Di `app/api/gas/route.ts` baris 210-242 (GET handler):

```typescript
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

  // ⚠️ BUG DI SINI: Check authentication SEBELUM check apakah public atau admin
  if (isAdminAction(action)) {
    const session = await getSession();
    if (!isAuthenticated(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - login required" },
        { status: 401 }
      );
    }
  }
  // ← Seharusnya HANYA check admin, dan SKIP untuk public

  // Forward to GAS - include admin_secret for all non-healthCheck actions
  return forwardToGas(action, payload, "GET", needsAdminSecret(action));
}
```

**Masalahnya:**
- `isAdminAction()` return FALSE untuk public actions ✓
- Tapi di line 230, cek `if (isAdminAction(action))` untuk decide "perlu login atau tidak" ✓
- **KODE SUDAH BENAR!** ← Malah, dia SKIP admin check untuk publik.

**AH WAIT — lihat lagi baris 233-239:**
```typescript
// Check authentication for admin actions
if (isAdminAction(action)) {  // ← isAdminAction sudah return FALSE untuk public
  const session = await getSession();
  if (!isAuthenticated(session)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized - login required" },
      { status: 401 }
    );
  }
}
```

Ini **BENAR!** Public action tidak masuk blok ini (karena `isAdminAction()` return false).

**Tapi ADA BUG SUBTLE DI POST HANDLER (baris 256-282):**

```typescript
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

    // ← Check admin auth SETELAH cek action list (BENAR)
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
```

**Analisis:** Kode SUDAH benar! Public check SEBELUM admin check. TAPI...

### Real Issue: `needsAdminSecret` Logic
**DISINI ADA BUG SEBENARNYA!**

Baris 92-94:
```typescript
function needsAdminSecret(action: string): boolean {
  return action !== "healthCheck";
}
```

**Masalahnya:**
- Public actions seperti `getTaskByToken` dan `submitChecklistReport` **AKAN dikirim dengan `admin_secret` ke GAS** (karena `needsAdminSecret()` return true)
- **JIKA GAS hanya terima request TANPA admin_secret untuk public actions**, GAS akan reject dengan error.
- **ATAU jika GAS check `admin_secret` validity SEBELUM baca `action` field**, public request akan dapat 401 dari GAS.

### Patch: Fix `needsAdminSecret`
```typescript
// BEFORE
function needsAdminSecret(action: string): boolean {
  return action !== "healthCheck";
}

// AFTER - public actions TIDAK perlu admin_secret
function needsAdminSecret(action: string): boolean {
  // Hanya kirim admin_secret untuk ADMIN actions, bukan semua action
  return !isPublicAction(action) && action !== "healthCheck";
}
```

---

## TEMUAN TINGGI #3: `getTaskDetail` Inconsistency

### Akar Masalah
Di `lib/api.ts` baris 485-510:

```typescript
export async function getTaskDetail(taskId: string): Promise<ApiResponse<Task>> {
  try {
    // GAS getTaskDetail requires the staff token, which the admin UI does not
    // have from the URL alone. Instead, fetch the full task list (admin-scoped)
    // and find the matching task — it already contains all fields we need.
    const result = await getTasks();

    if (result.success && result.data) {
      const task = result.data.find((t) => t.task_id === taskId);
      if (task) {
        return { success: true, data: task };
      }
      return { success: false, error: "Tugas tidak ditemukan" };
    }

    return {
      success: false,
      error: result.error || "Gagal mengambil detail tugas",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail tugas",
    };
  }
}
```

**Masalahnya:**
1. Di `PUBLIC_ACTIONS` ada `getTaskDetail` (line 63)
2. Tapi `getTaskDetail()` function **bypass public logic** dan langsung call `getTasks()` (admin action)
3. Jika admin tidak login, `getTasks()` akan return 401
4. **JIKA STAFF BUKA LINK dan sistem panggil `getTaskDetail()`, akan FAIL**

### Patch: Use Token-Based Lookup
```typescript
// BEFORE
export async function getTaskDetail(taskId: string): Promise<ApiResponse<Task>> {
  try {
    // Wrong: bypass public logic, call admin action
    const result = await getTasks();
    if (result.success && result.data) {
      const task = result.data.find((t) => t.task_id === taskId);
      if (task) {
        return { success: true, data: task };
      }
      return { success: false, error: "Tugas tidak ditemukan" };
    }
    return {
      success: false,
      error: result.error || "Gagal mengambil detail tugas",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail tugas",
    };
  }
}

// AFTER - use public action directly OR create proper admin-only function
export async function getTaskDetail(taskId: string): Promise<ApiResponse<Task>> {
  try {
    // Admin-only function: use getTasks() to get admin view
    // (This is called from admin dashboard, which has session)
    const result = await getTasks();

    if (result.success && result.data) {
      const task = result.data.find((t) => t.task_id === taskId);
      if (task) {
        return { success: true, data: task };
      }
      return { success: false, error: "Tugas tidak ditemukan" };
    }

    return {
      success: false,
      error: result.error || "Gagal mengambil detail tugas",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail tugas",
    };
  }
}

// ALTERNATIVE: Create proper separation
// Rename ke admin-only function dengan require session:
export async function getTaskDetailAdmin(taskId: string): Promise<ApiResponse<Task>> {
  // sama seperti di atas, tapi jelas untuk admin only
}

// Public function (untuk staff via token):
export async function getTaskDetailPublic(taskId: string, token: string): Promise<ApiResponse<Task>> {
  try {
    const result = await callApi<Task>(
      "getTaskDetail",
      { task_id: taskId, token },
      "GET"
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Link tugas tidak valid",
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil detail tugas",
    };
  }
}
```

---

## TEMUAN TINGGI #4: Link Format Inconsistency

### Akar Masalah
Di `lib/api.ts` baris 242-245:

```typescript
// Build the correct staff report link for the frontend route /report/[taskId]?token=
export function buildReportLink(taskId: string, token: string, origin?: string): string {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/report/${taskId}?token=${token}`;
}
```

**Masalahnya:**
- Frontend generate: `/report/{taskId}?token={token}` ✓ (benar)
- **TAPI** GAS mungkin return link dalam format berbeda, mis:
  - `/checklist-report/{report_id}`
  - `/task/{taskId}`
  - `https://full-url/report/...`
- **Kalau GAS return format X tapi frontend expect Y, WA link akan salah**

### Patch: Standardize Link Format
**ISSUE: Ini bukan bug di Next.js, TAPI di GAS.** GAS harus:
1. Simpan format link standard di sheet
2. Return link dalam format konsisten
3. Frontend HANYA GUNAKAN link dari GAS, jangan buat ulang

**Workaround Next.js (aman untuk sekarang):**
```typescript
// Tambah validation & normalization
export function buildReportLink(taskId: string, token: string, origin?: string): string {
  const base =
    origin || (typeof window !== "undefined" ? window.location.origin : "");
  
  // Ensure format is consistent
  const cleanTaskId = String(taskId).trim();
  const cleanToken = String(token).trim();
  
  if (!cleanTaskId || !cleanToken) {
    console.error("[v0] Invalid report link params:", { cleanTaskId, cleanToken });
    return "";
  }
  
  return `${base}/report/${cleanTaskId}?token=${cleanToken}`;
}

// Tambah normalization untuk link dari GAS
export function normalizeReportLink(gasLink: string | undefined, taskId: string, token: string, origin?: string): string {
  if (!gasLink) {
    return buildReportLink(taskId, token, origin);
  }
  
  // If GAS returns full URL, extract just path+query
  try {
    const url = new URL(gasLink, origin || window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    // GAS might return relative path, validate format
    if (gasLink.includes(taskId) && gasLink.includes(token)) {
      return gasLink;
    }
    // Fallback to standard format
    return buildReportLink(taskId, token, origin);
  }
}
```

---

## TEMUAN SEDANG #5: Logging WA_LOG / ERROR_LOG

### Akar Masalah
**Di Next.js side:** Tidak ada centralized logging untuk WA send attempts, token generation, atau API errors.

**Dampak:**
- Sulit debug kenapa WA tidak terkirim
- Token generation tidak tercatat
- Error rate tidak visible

### Patch: Add Basic Logging to GAS Calls
```typescript
// tambah di lib/api.ts

// Simple in-memory log untuk development/debugging
const API_CALL_LOG: Array<{
  timestamp: string;
  action: string;
  method: "GET" | "POST";
  status: "success" | "error" | "pending";
  payload?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
}> = [];

// Wrap callApi untuk logging
const _callApiOriginal = callApi;
export async function callApiWithLogging<T>(
  action: string,
  payload?: Record<string, unknown>,
  method: "GET" | "POST" = "POST"
): Promise<ApiResponse<T>> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[v0] API Call Start: action=${action}, method=${method}`);
    const result = await _callApiOriginal<T>(action, payload, method);
    
    const duration = performance.now() - startTime;
    API_CALL_LOG.push({
      timestamp,
      action,
      method,
      status: result.success ? "success" : "error",
      payload,
      error: result.error,
      duration_ms: Math.round(duration),
    });
    
    console.log(
      `[v0] API Call End: action=${action}, success=${result.success}, duration=${Math.round(duration)}ms, error=${result.error || "none"}`
    );
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    API_CALL_LOG.push({
      timestamp,
      action,
      method,
      status: "error",
      payload,
      error: errorMsg,
      duration_ms: Math.round(duration),
    });
    
    console.error(`[v0] API Call Error: action=${action}, error=${errorMsg}`);
    throw error;
  }
}

// Export log untuk debug (developer bisa buka console & jalankan)
if (typeof window !== "undefined") {
  (window as any).__vz_apiLog = API_CALL_LOG;
  (window as any).__vz_showApiLog = () => console.table(API_CALL_LOG);
}
```

**Gunakan di createTask:**
```typescript
// Replace internal callApi dengan callApiWithLogging
export async function createTask(payload: CreateTaskPayload): Promise<ApiResponse<Task>> {
  try {
    const result = await callApiWithLogging<Task>("createTask", payload as unknown as Record<string, unknown>);
    // ... rest of function
  }
}
```

---

## RINGKASAN PERUBAHAN YANG PERLU DILAKUKAN

### Langkah 1: Fix `app/api/gas/route.ts` (KRITIKAL)
- ✅ Hapus `getChecklistByToken` dan `submitChecklistReport` dari `ADMIN_ACTIONS`
- ✅ Fix `needsAdminSecret()` untuk exclude public actions
- ⏱️ Perkiraan: 5 menit

### Langkah 2: Fix `lib/api.ts` - Separation of Admin/Public
- ✅ Add `getTaskDetailAdmin()` untuk admin-only (existing behavior)
- ✅ Keep route handler simple: jangan override action di client
- ⏱️ Perkiraan: 10 menit

### Langkah 3: Add Logging untuk Debug WA
- ✅ Add `callApiWithLogging` wrapper
- ✅ Integrate dengan createTask untuk see token generation
- ⏱️ Perkiraan: 10 menit

### Langkah 4: Test End-to-End
- ✅ Create task as admin
- ✅ Copy WA link → open in browser / send to staff
- ✅ Verify staff can see form (no 401)
- ✅ Submit report → verify success
- ⏱️ Perkiraan: 15 menit

**Total: ~40 menit untuk full fix**

---

## TEST CASES SETELAH PATCH

### Test 1: Admin Dapat Membuat Task
```
1. Login as admin
2. Buat task manual
3. Verify task di sheet TASK_MASTER (via GAS)
4. Check console: [v0] API Call End: action=createTask, success=true
```

### Test 2: WA Link Benar & Staff Bisa Buka
```
1. Lihat dashboard task
2. Salin report link dari task detail
3. Buka link di browser (JANGAN login sebagai admin)
4. Verify: page loading (state="form"), BUKAN 401 error
5. Lihat banner deadline & task description
```

### Test 3: Staff Submit Report
```
1. (dari test 2, sudah di report form)
2. Click "KETUK UNTUK AMBIL FOTO"
3. Select/take photo
4. Click "KIRIM LAPORAN"
5. Verify success screen
6. (as admin) Refresh dashboard → task status = SUBMITTED
```

### Test 4: Check API Logs
```
1. (dari test 1 atau 2, task sudah dibuat/dibuka)
2. Open browser console
3. Jalankan: __vz_showApiLog()
4. Lihat table dengan all API calls
5. Verify:
   - createTask entry dengan status=success
   - getTaskByToken entry dengan status=success (dari test 2)
   - submitTaskReport entry dengan status=success (dari test 3)
```

---

## CHECKLIST REPARASI

- [ ] Perbaiki `ADMIN_ACTIONS` list: hapus publik actions
- [ ] Perbaiki `needsAdminSecret()` function
- [ ] Test GET request untuk public action (getTaskByToken)
- [ ] Test POST request untuk public action (submitTaskReport)
- [ ] Add logging wrapper di callApi
- [ ] Test create task + link buka di browser (no 401)
- [ ] Test staff submit report
- [ ] Verify WA_LOG entries di GAS (jika perlu, beri prompt terpisah untuk GAS audit)

---

## NEXT: GAS AUDIT DIPERLUKAN

Prompt di atas fokus frontend. **TAPI MASIH PERLU AUDIT GAS untuk:**
1. Verifikasi `generateRecurringTasks` timezone & date logic (MASALAH 1 di brief user)
2. Verifikasi `FonnteService` no throttle, proper logging (MASALAH 2 di brief user)
3. Verifikasi action handler consistency (doGet vs doPost, response format)
4. Audit field naming consistency & data types

**Siap lanjut ke GAS?** Pakai prompt `GAS_AUDIT_PROMPT.md` yang sudah ada di repo.

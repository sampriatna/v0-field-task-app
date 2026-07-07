# Testing Guide - Frontend Fixes for Task & Report System

## Fixes Applied

### 1. ✅ Removed Public Actions from ADMIN_ACTIONS list
- **File:** `app/api/gas/route.ts`
- **Change:** Removed `getChecklistByToken` and `submitChecklistReport` from ADMIN_ACTIONS
- **Why:** These public actions should never require admin authentication

### 2. ✅ Fixed `needsAdminSecret()` function
- **File:** `app/api/gas/route.ts`
- **Change:** Public actions no longer sent with admin_secret to GAS
- **Why:** Prevents "ADMIN_SECRET_INVALID" errors when staff open WA links

### 3. ✅ Added API Call Logging
- **File:** `lib/api.ts`
- **Change:** All API calls logged with timestamp, action, status, duration, and errors
- **Why:** Debug WA send failures, token generation issues

### 4. ✅ Added Link Normalization
- **File:** `lib/api.ts`
- **Change:** New `normalizeReportLink()` function handles different link formats from GAS
- **Why:** Ensure staff links work even if GAS returns format variations

---

## TEST PLAN (15 minutes)

### Test 1: Admin Creates Task ⏱️ 5 min
**Objective:** Verify task created successfully, token generated, link formatted correctly

1. Open application and login as **admin**
2. Go to Dashboard → **"TUGAS BARU"** → **"Buat Tugas Manual"**
3. Fill form:
   - **Outlet:** KBU
   - **Area:** Dapur
   - **Kategori:** Cleaning
   - **Task Title:** "TEST TASK FIX"
   - **Description:** "Testing the fixes"
   - **PIC:** Select any staff member
   - **Deadline:** Tomorrow 17:00
   - **Priority:** High
4. **Click "BUAT TUGAS"**

**Verify:**
- ✅ Success notification appears
- ✅ Task appears in dashboard
- ✅ Task status = "CREATED" or "SENT"
- ✅ Open browser console (F12) → type: `__vz_showApiLog()` → should see entry:
  ```
  action: "createTask"
  status: "success"
  duration_ms: (number < 5000)
  ```

---

### Test 2: Staff Opens WA Link (No Login) ⏱️ 5 min
**Objective:** Verify staff can open report link WITHOUT logging in, WITHOUT 401 error

1. From test 1, **click on the task** to view details
2. Find the **report link** (should be in format `/report/TASK-xxxxx?token=xxxxx`)
3. **Open link in NEW INCOGNITO/PRIVATE browser window** (simulates staff clicking WA link)
4. **Do NOT login**

**Verify:**
- ✅ Page loads (NOT redirected to login)
- ✅ See deadline banner: "Task Title: TEST TASK FIX"
- ✅ See task description & instructions
- ✅ See **"KETUK UNTUK AMBIL FOTO"** button
- ✅ Browser console shows NO 401 errors
- ✅ Console shows:
  ```
  [v0] API Call: GET action="getTaskDetail"
  [v0] API Success: action="getTaskDetail", duration=...ms
  ```

**If 401 error occurs:**
- Check GAS_WEB_APP_URL is set (Settings → Vars)
- Check ADMIN_API_KEY is set
- Check `app/api/gas/route.ts` ADMIN_ACTIONS list (public actions removed)
- Open GitHub and file an issue with console logs

---

### Test 3: Staff Submits Report ⏱️ 5 min
**Objective:** Verify staff can submit photo & note, report saved to sheet

1. From test 2, still in incognito window with open report form:
2. **Click "KETUK UNTUK AMBIL FOTO"**
3. Select or take a photo (or upload any image < 2MB)
4. Wait for "Foto siap ✓" message
5. Add optional note: "Test submission"
6. **Click "KIRIM LAPORAN"**

**Verify:**
- ✅ Success screen appears: "Laporan Berhasil Dikirim!"
- ✅ No error messages
- ✅ Close incognito window
- ✅ Go back to admin dashboard (original window)
- ✅ **Refresh** dashboard (F5)
- ✅ Task status changed to **"SUBMITTED"**
- ✅ Click task → see submitted photo in details
- ✅ Console logs show:
  ```
  [v0] API Call: POST action="submitTaskReport"
  [v0] API Success: action="submitTaskReport", duration=...ms
  ```

**If submit fails:**
- Check photo size < 2MB
- Check internet connection
- Check GAS endpoint responding (ask if WA sent correctly in first place)
- Check `app/api/gas/route.ts` has "submitChecklistReport" in PUBLIC_ACTIONS (not ADMIN_ACTIONS)

---

### Test 4: Check API Debug Logs ⏱️ 0 min (bonus)
**Objective:** Verify logging system working

1. Open any page in the app
2. Open browser console (F12)
3. Type: `__vz_showApiLog()` and press Enter
4. Should see table with all API calls from tests 1-3

**Verify:**
- ✅ Table shows columns: timestamp, action, method, status, duration_ms, error
- ✅ "createTask" entry has status="success"
- ✅ "getTaskDetail" (from test 2) has status="success"
- ✅ "submitTaskReport" (from test 3) has status="success"
- ✅ All duration_ms are reasonable (< 5000ms typically)

**Example log table:**
```
| timestamp           | action              | method | status  | duration_ms | error |
|---------------------|---------------------|--------|---------|-------------|-------|
| 2026-07-07T10:30:00 | createTask          | POST   | success | 1234        |       |
| 2026-07-07T10:30:15 | getTaskDetail       | GET    | success | 456         |       |
| 2026-07-07T10:30:45 | submitTaskReport    | POST   | success | 2123        |       |
```

---

## CHECKLIST - Before & After Fixes

### Before Fixes Applied
- [ ] Staff opens WA link → ERROR 401 or "Unauthorized"
- [ ] Public actions sent with admin_secret → "ADMIN_SECRET_INVALID"
- [ ] No way to debug WA send / token issues

### After Fixes Applied
- [x] Staff opens WA link → ✅ WORKS (no 401)
- [x] Public actions don't need admin_secret → ✅ CLEAN
- [x] API logs visible in console → ✅ DEBUG EASY

---

## TROUBLESHOOTING

### Issue: Still Getting 401 on Staff Link
```
Solution:
1. Check getTaskDetail in PUBLIC_ACTIONS (should be there)
2. Check isAdminAction("getTaskDetail") returns FALSE
3. Check needsAdminSecret("getTaskDetail") returns FALSE
4. Restart dev server: npm run dev
```

### Issue: "Foto terlalu besar" Error
```
Solution:
1. Photo must be < 2MB before upload
2. System auto-compresses to 1280px max
3. Try JPEG quality 0.7
4. Check API logs: error should show "413 Payload too large"
```

### Issue: API Logs Not Showing
```
Solution:
1. Check console shows [v0] prefix messages
2. Check __vz_apiLog exists: type in console
3. Verify callApi() function updated with logging
4. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Issue: "Link tidak valid" on Staff Form
```
Solution:
1. Check token in URL is correct (copy from task detail)
2. Check task actually exists in GAS sheet
3. Check WA was sent (verify in Fonnte dashboard)
4. Check link format: /report/{taskId}?token={token}
5. If GAS returns different format, normalizeReportLink() should handle
```

---

## NEXT STEPS - GAS SIDE AUDIT

These fixes are **frontend only**. Remaining issues to audit in Google Apps Script:

1. **generateRecurringTasks** — Why CLOSING/WEEKLY tasks not generating?
   - Check timezone (should be Asia/Jakarta)
   - Check date comparison logic
   - File: GAS main script

2. **FonnteService** — Why WA status "unknown" and throttling?
   - Check sleep between sends
   - Check request payload format
   - Check error logging to WA_LOG sheet
   - File: GAS Fonnte integration

3. **Action Handler Consistency** — doGet vs doPost
   - Check all public actions handle both methods
   - Check response format consistent
   - File: GAS doGet/doPost handlers

Use the prompt `GAS_AUDIT_PROMPT.md` for detailed GAS audit.

---

## CONSOLE COMMANDS FOR DEBUGGING

```javascript
// Show all API calls
__vz_showApiLog()

// Export logs as JSON (paste into text editor)
copy(JSON.stringify(__vz_apiLog, null, 2))

// Filter logs by action
__vz_apiLog.filter(log => log.action === 'submitTaskReport')

// Find failed API calls
__vz_apiLog.filter(log => log.status === 'error')

// Calculate average API time
__vz_apiLog.reduce((sum, log) => sum + log.duration_ms, 0) / __vz_apiLog.length

// Clear logs and start fresh
__vz_apiLog.length = 0
```

---

## SUCCESS CRITERIA

All tests pass if:
- ✅ Test 1: Task created, token generated, visible in logs
- ✅ Test 2: Staff opens link without login, no 401 errors
- ✅ Test 3: Staff submits photo, task status updates to SUBMITTED
- ✅ Test 4: Debug logs show all 3 API calls with success status
- ✅ No error messages in browser console (except expected ones)

**Estimated time:** 15-20 minutes for full test cycle

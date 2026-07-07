# 🔍 PROMPT CLAUDE: AUDIT GOOGLE APPS SCRIPT (GAS) - NF3 Task & Report System

> **Tujuan:** Audit backend Google Apps Script untuk temukan bug recurring tasks, throttling WA, dan logging issues.  
> **Konteks:** Frontend Next.js sudah diperbaiki (staff link work, logging added). Bug remaining ada di GAS.

---

## 📋 KONTEKS SINGKAT

### Sistem Architecture
```
Next.js Frontend (/api/gas proxy) → Google Apps Script (Web App) → Google Sheets
                                            ↓
                                      Fonnte API → WhatsApp
```

### Status Frontend ✅
- [x] Public actions tidak lagi di ADMIN_ACTIONS list
- [x] `needsAdminSecret()` fix: public actions tanpa admin_secret
- [x] Logging system added: `__vz_showApiLog()` di browser console
- [x] Link normalization: handle format variations

### Bug Remaining di GAS ❌
1. **Recurring tasks CLOSING & WEEKLY tidak ter-generate** (KRITIKAL)
2. **WhatsApp throttling, status "unknown" di Fonnte** (KRITIKAL)
3. **WA_LOG / ERROR_LOG tidak populated** (TINGGI)
4. **Field naming inconsistency** (SEDANG)

---

## 🎯 MASALAH #1: Recurring Tasks Tidak Ter-Generate (PRIORITAS UTMOST)

### Symptom
- Task **OPENING** (pagi hari) dibuat ✅ + WA terkirim ✅
- Task **CLOSING** (malam hari) tidak dibuat ❌
- Task **WEEKLY** (repeat_days kosong) tidak dibuat ❌
- Log GAS menunjukkan skip dengan alasan: `ALREADY_EXISTS` atau `WEEKLY_REPEAT_DAYS_EMPTY`

### Yang Harus Diaudit
```javascript
// File: Google Apps Script main file
function generateRecurringTasks() {
  // 1. Ambil template dari sheet RECURRING_TEMPLATES
  // 2. Loop setiap template
  // 3. Check apakah "sudah dibuat hari ini"
  // 4. Kalau belum, create task
  // 5. Send WA
}

function generateTaskFromTemplateIfNotExists_(template) {
  // 1. Build task_date: pakai timezone apa? Asia/Jakarta atau UTC?
  // 2. Cek TASK_MASTER: apakah ada task dengan template_id + task_date?
  // 3. Kalau ada, skip (return "ALREADY_EXISTS")
  // 4. Kalau tidak ada, create task
}
```

### Pertanyaan Audit Spesifik
1. **Timezone Issue?**
   - Apakah `new Date()` atau `Utilities.formatDate()` pakai timezone **Asia/Jakarta**?
   - Apakah `task_date` comparison bandingkan **hari yang sama** di timezone Jakarta?
   - Apakah ada risk "tanggal kemarin UTC" dianggap "hari ini"?

2. **Date Comparison Logic?**
   ```javascript
   // Contoh bug potensial:
   const today = Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd"); // WRONG: UTC
   const today = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"); // RIGHT
   
   // Cek apakah task untuk template X + today sudah ada:
   const exists = taskSheet.getDataRange().getValues()
     .filter(row => row[col_template_id] === template.template_id)
     .filter(row => row[col_task_date] === today)
     .length > 0;
   ```

3. **CLOSING Deadline Midnight Issue?**
   - Kalau task CLOSING punya deadline "23:59" atau "00:00", apakah dianggap untuk "hari yang salah"?
   - Apakah ada logic: "deadline malam hari" = "task dibuat untuk hari sebelumnya"?

4. **WEEKLY repeat_type Logic?**
   ```javascript
   // Contoh bug potensial:
   if (template.repeat_type === "WEEKLY" && template.repeat_days.length === 0) {
     return "WEEKLY_REPEAT_DAYS_EMPTY"; // WRONG: skip template
   }
   // SEHARUSNYA:
   // WEEKLY dengan repeat_days kosong = jalankan setiap hari Senin? Atau default behavior?
   ```

5. **Trigger Time & Execution?**
   - Apakah daily trigger jalan jam berapa? (cek `ScriptApp.getProjectTriggers()`)
   - Apakah trigger jalan SEBELUM atau SETELAH window untuk CLOSING tasks?
   - Contoh: trigger jam 00:00, tapi CLOSING task untuk jam 23:00 kemarin → skip

### Output yang Diminta
```markdown
**MASALAH #1 ROOT CAUSE:**
[Jelaskan akar masalah timezone / date comparison / repeat_type logic]

**CODE LAMA (bug):**
```javascript
// Paste snippet kode yang salah
```

**CODE BARU (patch):**
```javascript
// Paste snippet kode fix
```

**EXPLANATION:**
[2-3 kalimat jelaskan kenapa fix ini solve issue]
```

---

## 🎯 MASALAH #2: WhatsApp Throttling / Status "unknown"

### Symptom
- Setelah `generateRecurringTasks()` jalan, field `wa_sent_at` terisi ✅
- Tapi di dashboard Fonnte, status pesan = **"unknown"** ❌
- Sebagian staff (yang dikirim duluan) menerima WA ✅
- Sisanya (dikirim beruntun) nyangkut "unknown" ❌
- Gejala: **throttling / burst limit** dari Fonnte

### Yang Harus Diaudit
```javascript
// File: FonnteService.gs atau sendWhatsApp()
function sendNewTask(task) {
  const url = "https://api.fonnte.com/send";
  const payload = {
    target: task.pic_wa,  // Format: "62xxx" atau "+62xxx" atau "08xxx"?
    message: "...",
    countryCode: "62"
  };
  
  const options = {
    method: "post",
    headers: { "Authorization": FONNTE_API_KEY },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  // 1. Apakah ada Utilities.sleep() setelah send?
  // 2. Apakah response di-parse untuk cek error?
  // 3. Apakah wa_sent_at ditulis SEBELUM atau SESUDAH verify response?
}
```

### Pertanyaan Audit Spesifik
1. **Sleep/Delay Between Sends?**
   ```javascript
   // Bug: kirim 10 WA dalam 1 detik → throttled
   tasks.forEach(task => {
     sendNewTask(task);  // NO DELAY
   });
   
   // Fix: delay 3-8 detik antar send
   tasks.forEach((task, index) => {
     sendNewTask(task);
     if (index < tasks.length - 1) {
       Utilities.sleep(5000); // 5 detik delay
     }
   });
   ```

2. **Response Validation?**
   ```javascript
   const response = UrlFetchApp.fetch(url, options);
   const result = JSON.parse(response.getContentText());
   
   // Check: apakah ada handling untuk result.status === false?
   if (!result.status || result.reason) {
     // Log error ke ERROR_LOG
     // Set wa_status = "FAILED"
   } else {
     // Set wa_status = "SENT" (tapi ini bukan "delivered"!)
     // Set wa_sent_at = now
   }
   ```

3. **Nomor HP Format?**
   ```javascript
   // Bug: Fonnte reject "+62" atau "08" prefix
   function normalizePhoneNumber(wa) {
     wa = wa.replace(/\+/g, "").replace(/\s/g, ""); // Hapus + dan spasi
     if (wa.startsWith("0")) wa = "62" + wa.substring(1); // 08xxx → 62xxx
     return wa;
   }
   ```

4. **WA_LOG Entry?**
   - Apakah SEMUA send attempt masuk ke WA_LOG (baik sukses maupun gagal)?
   - Field minimal: `timestamp`, `task_id`, `pic_wa`, `status` (SENT/FAILED), `fonnte_response`, `error_message`

5. **Retry Logic?**
   - Apakah ada retry untuk pesan yang gagal?
   - Atau setidaknya flag `wa_status = "PENDING"` untuk di-retry manual?

### Output yang Diminta
```markdown
**MASALAH #2 ROOT CAUSE:**
[Jelaskan throttling, missing sleep, response validation]

**CODE LAMA (bug):**
```javascript
// Paste snippet kode yang salah
```

**CODE BARU (patch):**
```javascript
// Paste snippet kode fix dengan sleep, validation, logging
```

**EXPLANATION:**
[2-3 kalimat jelaskan kenapa fix ini solve throttling]
```

---

## 🎯 MASALAH #3: WA_LOG / ERROR_LOG Tidak Populated

### Symptom
- Sheet WA_LOG ada tapi kosong atau entry minimal
- Tidak ada detail error untuk debugging
- Tidak trace "kenapa WA tidak terkirim"

### Yang Harus Diaudit
```javascript
// Fungsi logging helper
function logToWaLog(task_id, pic_wa, status, response, error) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("WA_LOG");
  const timestamp = new Date();
  sheet.appendRow([timestamp, task_id, pic_wa, status, JSON.stringify(response), error || ""]);
}

// Panggil di setiap send attempt
function sendNewTask(task) {
  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    if (result.status === true) {
      logToWaLog(task.task_id, task.pic_wa, "SENT", result, null);
    } else {
      logToWaLog(task.task_id, task.pic_wa, "FAILED", result, result.reason);
    }
  } catch (error) {
    logToWaLog(task.task_id, task.pic_wa, "ERROR", null, error.message);
  }
}
```

### Pertanyaan Audit Spesifik
1. Apakah ada fungsi centralized `logToWaLog()` atau `logError()`?
2. Apakah setiap `sendNewTask()` dan `sendChecklistTask()` call logging?
3. Apakah error caught dan logged (try/catch)?
4. Apakah sheet WA_LOG punya header: `timestamp`, `task_id`, `pic_wa`, `status`, `response`, `error`?

### Output yang Diminta
```markdown
**MASALAH #3 ROOT CAUSE:**
[Jelaskan missing logging, no centralized function]

**CODE BARU (patch):**
```javascript
// Paste snippet logging helper & integration
```
```

---

## 📊 AUDIT CHECKLIST (COMPREHENSIVE)

### A. Action Contract Validation
Untuk setiap action di list ini, cek:
- Apakah ada di `doGet(e)` atau `doPost(e)` switch case?
- Apakah payload cocok dengan expectation frontend?
- Apakah response format `{ success: true/false, data: ..., error: ... }`?

**Public Actions (tanpa admin_secret):**
- `healthCheck`
- `getTaskByToken`
- `getTaskDetail` (dengan token)
- `markOpened`
- `submitTaskReport`
- `getChecklistByToken`
- `submitChecklistReport`

**Admin Actions (dengan admin_secret):**
- `createTask`, `getTasks`, `verifyTask`, `requestRevision`, `deleteTask`
- `getRecurringTemplates`, `createRecurringTemplate`, `updateRecurringTemplate`, `generateRecurringTasks`
- `getChecklistReports`, `getChecklistDetail`, `approveChecklist`
- `getStaff`, `createStaff`, `updateStaff`
- (dll... lihat ADMIN_ACTIONS di frontend)

**Output:** Tabel
| Action | Ada? | Payload Cocok? | Response Cocok? | Catatan |
|--------|------|----------------|-----------------|---------|
| getTaskByToken | ✅ | ✅ | ✅ | - |
| ... | | | | |

### B. Field Naming Consistency
- Apakah `staff_name` atau `name`?
- Apakah `is_active` atau `active_status` atau `status`?
- Apakah `created_at` atau `createdAt`?
- Apakah `task_date` atau `date` atau `report_date`?

**Output:** Daftar field inconsistency + patch

### C. Security
- Apakah `admin_secret` / `api_key` validated SEBELUM write operation?
- Apakah password user di-hash (bukan plain text)?
- Apakah token cukup random (bukan sequential)?
- Apakah public action validate token SEBELUM return data?

**Output:** Temuan + patch

### D. Performance & Reliability
- Apakah `SpreadsheetApp.getRange()` di dalam loop? (SLOW)
- Apakah pakai `getDataRange().getValues()` → process batch → `setValues()`? (FAST)
- Apakah pakai `LockService` untuk prevent race condition?
- Apakah ada try/catch di setiap action?

**Output:** Temuan + optimization suggestion

### E. Triggers
- List semua trigger aktif (via `ScriptApp.getProjectTriggers()`)
- Check ada duplikat atau tidak?
- Check timezone project: `SpreadsheetApp.getActive().getSpreadsheetTimeZone()`

**Output:** Trigger list + validation

---

## 📤 FORMAT OUTPUT YANG SAYA HARAPKAN

### 1. Ringkasan Eksekutif (5-10 baris)
```
- Temuan #1: [issue] → Impact: [dampak] → Status: [kritikal/tinggi/sedang]
- Temuan #2: ...
- Temuan #3: ...
- [dst]
```

### 2. Detail Temuan Kritikal (Masalah #1 & #2)
```markdown
## TEMUAN KRITIKAL #1: Recurring Tasks CLOSING/WEEKLY Tidak Generate

**ROOT CAUSE:**
[Akar masalah timezone / date comparison / repeat_type logic]

**CODE LAMA:**
```javascript
// Bug code
```

**CODE BARU (PATCH):**
```javascript
// Fixed code
```

**EXPLANATION:**
[2-3 kalimat]

**TEST CASE:**
1. [Langkah test untuk verify fix]
```

### 3. Tabel Audit Action (Bagian A)
| Action | Ada? | Payload Cocok? | Response Cocok? | Bug? |
|--------|------|----------------|-----------------|------|
| ... | | | | |

### 4. Daftar Bug Lainnya (B-E)
```markdown
## Bug Sedang #1: Field Naming Inconsistency
- File: [nama fungsi]
- Issue: [deskripsi]
- Patch: [kode fix]
```

### 5. Rencana Perbaikan Berurutan
```markdown
1. [Fix #1 - KRITIKAL - 10 menit]
2. [Fix #2 - KRITIKAL - 15 menit]
3. [Fix #3 - TINGGI - 5 menit]
...
```

### 6. Script Uji (Testing)
```javascript
// Test recurring task generation (manual)
function _test_generateClosingTask() {
  // ...
}

// Test Fonnte send dengan delay
function _test_fonnteSendWithDelay() {
  // ...
}
```

---

## 🛠️ UTILITY SCRIPTS (JALANKAN DI GAS EDITOR)

Salin scripts ini ke GAS, jalankan, lampirkan hasil:

```javascript
// 1. Cek timezone project
function _audit_timezone() {
  Logger.log("Spreadsheet TZ: " + SpreadsheetApp.getActive().getSpreadsheetTimeZone());
  Logger.log("Session TZ: " + Session.getScriptTimeZone());
  Logger.log("Now (Jakarta): " + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
}

// 2. Daftar semua trigger aktif
function _audit_triggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    Logger.log(`Trigger: ${t.getHandlerFunction()} | Event: ${t.getEventType()} | Source: ${t.getTriggerSource()}`);
  });
}

// 3. Daftar nama sheet & jumlah baris
function _audit_sheets() {
  SpreadsheetApp.getActive().getSheets().forEach(s => {
    Logger.log(`Sheet: ${s.getName()} | Rows: ${s.getLastRow()} | Cols: ${s.getLastColumn()}`);
  });
}

// 4. Dry-run recurring tasks (tanpa create task atau send WA)
function _audit_recurring_dryrun() {
  const templates = getRecurringTemplates(); // Sesuaikan fungsi
  templates.forEach(template => {
    const today = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    const exists = checkTaskExistsForToday(template.template_id, today); // Sesuaikan fungsi
    
    Logger.log(`Template: ${template.template_name} | Repeat: ${template.repeat_type} | Today: ${today} | Exists: ${exists}`);
    
    if (exists) {
      Logger.log(`  → SKIP (already exists)`);
    } else {
      Logger.log(`  → WILL CREATE (if trigger runs)`);
    }
  });
}

// 5. Test Fonnte send (ke nomor test, bukan production)
function _test_fonnteSend() {
  const testWA = "628123456789"; // GANTI DENGAN NOMOR TEST ANDA
  const url = "https://api.fonnte.com/send";
  const payload = {
    target: testWA,
    message: "Test dari audit GAS - " + new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"}),
    countryCode: "62"
  };
  
  const options = {
    method: "post",
    headers: { "Authorization": PropertiesService.getScriptProperties().getProperty("FONNTE_API_KEY") },
    payload: JSON.stringify(payload),
    contentType: "application/json"
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    Logger.log("Fonnte Response: " + JSON.stringify(result));
    
    if (result.status === true) {
      Logger.log("✅ SENT");
    } else {
      Logger.log("❌ FAILED: " + result.reason);
    }
  } catch (error) {
    Logger.log("❌ ERROR: " + error.message);
  }
}
```

---

## ✅ SUCCESS CRITERIA

Audit selesai jika:
1. Root cause untuk CLOSING/WEEKLY tasks identified + patch provided
2. Root cause untuk Fonnte throttling identified + patch provided (dengan sleep & logging)
3. Logging helper added untuk WA_LOG & ERROR_LOG
4. Field naming standardized
5. Action contract validated (tabel lengkap)
6. Test scripts provided untuk verify each fix

---

## 🚀 NEXT STEPS SETELAH AUDIT

1. Apply patches ke GAS
2. Test manual: jalankan `_test_*` functions
3. Test end-to-end: create task → verify WA sent → staff buka link → submit
4. Monitor WA_LOG: semua entry masuk dengan detail lengkap
5. Deploy & observe recurring tasks generation (next day)

---

**CATATAN PENTING:**
- Fokus HANYA pada GAS (backend)
- Frontend sudah fix, tidak perlu re-audit
- Prioritas: MASALAH #1 (recurring) dan #2 (throttling) karena impact harian
- Output harus include CODE SNIPPET, bukan hanya teori
- Setiap patch harus include TEST CASE untuk verify

**Siap untuk audit? Mulai dari MASALAH #1 dan #2 (KRITIKAL).**

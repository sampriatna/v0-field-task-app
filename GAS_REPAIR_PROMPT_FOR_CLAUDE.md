# GAS Repair Prompt - Copy-Paste ke Claude

Saya sudah audit backend Google Apps Script sistem v0-field-task-app. Berikut 5 bug kritikal + konteks lengkap untuk diperbaiki:

---

## KONTEKS SISTEM
- **Frontend**: Next.js 16 (app di `/vercel/share/v0-project`)
- **Backend**: Google Apps Script (kode ada di GAS project terpisah)
- **Data**: Google Sheets (tasks, templates, staff, etc)
- **Integrasi**: Fonnte API → WhatsApp, Vercel → GAS via webhook
- **Alur**: Next.js → `/api/gas` (proxy) → GAS web app → Sheets/Fonnte

---

## 5 BUG KRITIKAL YANG PERLU DIPERBAIKI

### BUG #1: Grace Window 30 Menit Memblokir Tugas CLOSING Setiap Hari ⚠️ URGENT
**Gejala**: Tugas shift CLOSING (Closing Kasir, Closing Kitchen, Closing Bar, Closing Waiters) TIDAK ter-generate otomatis setiap hari sejak 24 Juni. Hanya tugas OPENING yang jalan.

**Root Cause**: Fungsi `generateRecurringTasks()` punya logika pengecekan apakah tugas sudah dibuat hari ini. Pengecekan ini:
```javascript
// KODE LAMA (BUG)
const lastTaskDate = tasks
  .filter(t => t.template_id === template.id)
  .map(t => new Date(t.created_at))
  .sort((a, b) => b - a)[0];

const hoursSinceLastTask = (new Date() - lastTaskDate) / (1000 * 60 * 60);
if (hoursSinceLastTask < 30) {
  Logger.log("Task recently created, skipping: " + template.id);
  continue; // BUG: SKIP generate
}
```

Masalahnya: Grace window 30 menit terlalu pendek untuk CLOSING. Tugas CLOSING hari kemarin masih dalam "30 menit window" saat trigger pagi → di-skip selamanya.

**Perbaikan**:
```javascript
// KODE BARU
const DEFAULT_GRACE_MINUTES = 240; // 4 jam, tidak 30 menit
// ... existing logic ...
const hoursSinceLastTask = (new Date() - lastTaskDate) / (1000 * 60 * 60);
if (hoursSinceLastTask < DEFAULT_GRACE_MINUTES / 60) {
  Logger.log("Task recently created (" + hoursSinceLastTask.toFixed(1) + "h), skipping: " + template.id);
  continue;
}
```

**Testing**: Setelah perbaikan, cek bahwa tugas CLOSING pukul 18:00-20:00 ter-generate otomatis setiap hari.

---

### BUG #2: Template WEEKLY Dengan `repeat_days` Kosong Tidak Ter-Generate ⚠️ URGENT
**Gejala**: Template mingguan (KBU Weekly Dapur, DUL Cuci Mobil) tidak pernah dibuat otomatis.

**Root Cause**: Pengecekan `repeat_days` diam-diam skip template:
```javascript
// KODE LAMA (BUG)
if (template.repeat_type === "WEEKLY" && !template.repeat_days) {
  Logger.log("Skipping weekly template with empty repeat_days");
  continue; // BUG: SILENT SKIP
}
```

Tidak ada error logging, jadi admin tidak tahu template-nya di-skip.

**Perbaikan**:
```javascript
// KODE BARU
if (template.repeat_type === "WEEKLY") {
  if (!template.repeat_days || template.repeat_days.trim() === "") {
    Logger.log("ERROR: Weekly template has empty repeat_days: " + template.id + " - " + template.task_title);
    ErrorLog.logError("generateRecurringTasks", "WEEKLY template missing repeat_days", template.id);
    continue; // EXPLICIT skip dengan LOG
  }
  // ... proceed with repeat_days parsing ...
}
```

**Testing**: Pastikan weekly template dengan repeat_days kosong minimal log error, atau auto-generate sesuai kebijakan.

---

### BUG #3: Tidak Ada `Utilities.sleep()` Antar Pengiriman WA → Throttling Fonnte ⚠️ MEDIUM
**Gejala**: Saat batch generate 6+ tugas sekaligus, status WA di Fonnte menunjukkan "unknown" (tertahan, belum delivered). Cuma sebagian yang "delivered" (Udin, DUL lolos duluan).

**Root Cause**: Pengiriman WA ke Fonnte tidak ada jeda:
```javascript
// KODE LAMA (BUG)
for (const task of newTasks) {
  FonnteService.sendChecklistTask(task); // Bam-bam-bam 6 pesan 1 detik
  // Fonnte / WhatsApp rate limit → status "unknown"
}
```

**Perbaikan**:
```javascript
// KODE BARU
for (let i = 0; i < newTasks.length; i++) {
  const task = newTasks[i];
  FonnteService.sendChecklistTask(task);
  
  // Jeda 5 detik antar pesan (rate limit-friendly)
  if (i < newTasks.length - 1) {
    Utilities.sleep(5000); // 5000 ms = 5 detik
  }
}
```

**Testing**: Kirim 6 tugas sekaligus, cek di dashboard Fonnte — semua harus status "delivered" dalam 30 detik, tidak ada "unknown".

---

### BUG #4: `wa_sent_at` Bukan Indikator Terkirim (Clarification + Docs Update)
**Gejala**: Frontend lihat `wa_sent_at` terisi, asumsikan WA berhasil terkirim. Tapi status Fonnte "unknown" = belum delivered.

**Root Cause**: Bukan bug kode, tapi semantic confusion. `wa_sent_at` = "Fonnte terima request", bukan "WhatsApp deliver sukses".

**Perbaikan (Dokumentasi + Fields)**:
```javascript
// Di sheet Tasks, tambah 2 kolom baru:
// - wa_sent_at (existing, artinya: "request dikirim ke Fonnte")
// - wa_delivered_at (baru, artinya: "WhatsApp confirm delivered")

// Di function updateWaDeliveryStatus(taskId, status):
if (status === "delivered" || status === "read") {
  const task = sheet.getRange(...).getValues()[0];
  task.wa_delivered_at = new Date();
  sheet.appendRow(task); // UPDATE sheet
}
```

**Testing**: Kirim test WA, tunggu status Fontre jadi "delivered", cek bahwa `wa_delivered_at` terupdate di sheet.

---

### BUG #5: Function Call Error di `saveChecklistItems()` 
**Gejala**: Form input checklist item (di report page staff) kadang gagal disimpan. Error di console.

**Root Cause**: Function call tidak sesuai signature:
```javascript
// KODE LAMA (BUG)
function saveChecklistItems(taskId, items) {
  try {
    const result = ChecklistService.saveItemsForTask(taskId, items); // ← nama function salah?
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

Fungsi `ChecklistService.saveItemsForTask()` tidak ada atau nama beda.

**Perbaikan**:
Cari fungsi yang benar di GAS:
```javascript
// OPTION A: Jika fungsi ada tapi nama beda
const result = ChecklistItemStore.save(taskId, items);

// OPTION B: Jika belum ada, buat baru
function saveChecklistItems(taskId, items) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("ChecklistItems");
  for (const item of items) {
    sheet.appendRow([
      taskId,
      item.item_text,
      item.completed ? "YES" : "NO",
      new Date(),
      item.notes || ""
    ]);
  }
  return { success: true, count: items.length };
}
```

**Testing**: Submit form checklist dari report page, pastikan items tersimpan di sheet.

---

## SECONDARY ISSUES (Medium Priority)

Jika sudah fix 5 bug di atas, prioritas berikutnya:
- Inconsistensi field naming: `is_active` vs `active_status` vs `active`
- Actions missing di switch case: `getDashboardSummary`, `getChecklistTemplates` — extend casenya
- Duplikat `getChecklistByToken` di GET dan POST
- Rate limiting di `loginUser` → tambah counter per IP
- Trigger duplikasi check → gunakan `ScriptProperties.getProperty("lastTriggerId")`

---

## DIAGNOSTIK SIAP-JALAN (Optional — untuk verifikasi)

Copy-paste 2 fungsi di GAS Script Editor untuk quick health check:

```javascript
// 1. Audit grace window & template counts
function auditGenerateRecurringTasks() {
  const templates = getRecurringTemplates();
  const tasks = getAllTasks();
  
  for (const tpl of templates) {
    const recent = tasks
      .filter(t => t.template_id === tpl.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    const hoursSince = recent ? (new Date() - new Date(recent.created_at)) / (1000*60*60) : 999;
    Logger.log(`Template: ${tpl.task_title} | Last task: ${hoursSince.toFixed(1)}h ago | Will skip: ${hoursSince < 0.5}`);
  }
}

// 2. Cek WA sent vs delivered mismatch
function auditWaDeliveryStatus() {
  const tasks = getAllTasks();
  const sentButNotDelivered = tasks.filter(t => t.wa_sent_at && !t.wa_delivered_at);
  Logger.log("WA sent but not delivered: " + sentButNotDelivered.length + " tasks");
  for (const t of sentButNotDelivered.slice(0, 10)) {
    Logger.log(`- ${t.task_id} (${t.pic_name}): sent ${t.wa_sent_at}, status unknown`);
  }
}

// Panggil dari Script Editor console:
// auditGenerateRecurringTasks()
// auditWaDeliveryStatus()
```

---

## IMPLEMENTASI CHECKLIST

- [ ] Fix grace window (BUG #1): ubah 30 menit → 4 jam
- [ ] Fix WEEKLY repeat_days (BUG #2): tambah error logging
- [ ] Fix WA throttling (BUG #3): tambah `Utilities.sleep(5000)`
- [ ] Clarify wa_sent_at vs wa_delivered_at (BUG #4): update docs + tambah field
- [ ] Fix saveChecklistItems function call (BUG #5): cari & ganti function name
- [ ] Test setiap fix dengan automation trigger
- [ ] Deploy ke GAS production
- [ ] Monitor 24 jam: cek tugas CLOSING gen setiap hari, WA status "delivered", tidak ada errors

---

## TESTING COMMANDS (untuk verifikasi di Sheet)

1. **Cek tugas CLOSING hari ini ter-generate**:
   ```
   Filter Tasks sheet: task_date = today, status = OPEN/SENT
   Harus ada 4 CLOSING (Ayu, Udin, Bintang, Sonaji)
   ```

2. **Cek WA status**:
   ```
   Filter Tasks sheet: wa_sent_at = NOT empty, wa_delivered_at = empty
   Harus 0 rows (semua delivered), atau terhitung dalam hitungan menit jadi delivered
   ```

3. **Cek error log**:
   ```
   Buka sheet "ErrorLog"
   Harus tidak ada error "generateRecurringTasks" atau "WEEKLY template missing repeat_days"
   ```

---

Siap diperbaiki?

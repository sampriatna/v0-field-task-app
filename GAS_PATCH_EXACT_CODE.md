# GAS PATCH - EXACT CODE TO COPY-PASTE

Copy kode di bawah satu per satu ke GAS editor.

---

## PATCH #1: Timezone Fix (PENTING!)

**Lokasi**: Function `generateRecurringTasks()` - line awal

**OLD CODE (HAPUS):**
```javascript
function generateRecurringTasks() {
  const today = new Date();
```

**NEW CODE (PASTE GANTI):**
```javascript
function generateRecurringTasks() {
  // Use Asia/Jakarta timezone (UTC+7) for Indonesia
  const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const today = new Date(jakartaTime);
  Logger.log("[RECURRING] Trigger time (Asia/Jakarta): " + today);
```

---

## PATCH #2: Grace Window Fix (CRITICAL!)

**Lokasi**: Function `generateRecurringTasks()` - bagian checking last task

**OLD CODE (HAPUS):**
```javascript
  const lastTaskDate = tasks
    .filter(t => t.template_id === template.id)
    .map(t => new Date(t.created_at))
    .sort((a, b) => b - a)[0];

  const hoursSinceLastTask = (new Date() - lastTaskDate) / (1000 * 60 * 60);
  if (hoursSinceLastTask < 30) {
    Logger.log("Task recently created, skipping: " + template.id);
    continue;
  }
```

**NEW CODE (PASTE GANTI):**
```javascript
  const lastTaskDate = tasks
    .filter(t => t.template_id === template.id)
    .map(t => new Date(t.created_at))
    .sort((a, b) => b - a)[0];

  // Grace window: 4 jam untuk DAILY/CLOSING, 12 jam untuk WEEKLY
  const graceHours = template.repeat_type === "WEEKLY" ? 12 : 4;
  const hoursSinceLastTask = (new Date() - lastTaskDate) / (1000 * 60 * 60);
  
  if (hoursSinceLastTask < graceHours) {
    Logger.log("[RECURRING] Task recently created (" + hoursSinceLastTask.toFixed(1) + "h), skipping [grace: " + graceHours + "h]: " + template.id);
    continue;
  }
  Logger.log("[RECURRING] Task eligible (last was " + hoursSinceLastTask.toFixed(1) + "h ago): " + template.id);
```

---

## PATCH #3: Throttling Fix (PENTING untuk WA stability)

**Lokasi**: Function di mana WA dikirim (cari "sendChecklistTask" atau "sendWhatsApp")

**OLD CODE (HAPUS):**
```javascript
  // Send WhatsApp notifications
  for (const task of newTasks) {
    FonnteService.sendChecklistTask(task);
  }
```

**NEW CODE (PASTE GANTI):**
```javascript
  // Send WhatsApp notifications with throttling (5s per message)
  for (let i = 0; i < newTasks.length; i++) {
    const task = newTasks[i];
    try {
      FonnteService.sendChecklistTask(task);
      Logger.log("[WA] Sent task: " + task.task_title);
      
      // Add 5-second delay between messages to avoid rate limiting
      if (i < newTasks.length - 1) {
        Utilities.sleep(5000);
      }
    } catch (e) {
      Logger.log("[WA ERROR] Failed to send: " + task.task_title + " - " + e.message);
    }
  }
```

---

## PATCH #4: Error Logging untuk WEEKLY Templates (Optional tapi recommended)

**Lokasi**: Function `generateRecurringTasks()` - bagian checking WEEKLY templates

**OLD CODE (HAPUS):**
```javascript
  if (template.repeat_type === "WEEKLY" && !template.repeat_days) {
    Logger.log("Skipping weekly template with empty repeat_days");
    continue;
  }
```

**NEW CODE (PASTE GANTI):**
```javascript
  if (template.repeat_type === "WEEKLY") {
    if (!template.repeat_days || template.repeat_days.trim() === "") {
      const errorMsg = "WEEKLY template missing repeat_days: " + template.id + " - " + template.task_title;
      Logger.log("[ERROR] " + errorMsg);
      // Optional: log to ERROR_LOG sheet if you have error logging function
      if (typeof ErrorLog !== 'undefined' && ErrorLog.logError) {
        ErrorLog.logError("generateRecurringTasks", errorMsg, template.id);
      }
      continue;
    }
    // Proceed with repeat_days
  }
```

---

## PATCH #5: Add Logging untuk Debugging (Optional)

**Lokasi**: Function `generateRecurringTasks()` - bagian result

**TAMBAH (sebelum return/end function):**
```javascript
  Logger.log("[RECURRING] Total new tasks created: " + newTasks.length);
  Logger.log("[RECURRING] Function completed at: " + new Date());
  
  return {
    success: true,
    tasksCreated: newTasks.length,
    timestamp: new Date(),
    templates: templates.length,
    timezone: "Asia/Jakarta"
  };
```

---

## ✅ VERIFICATION AFTER PATCH

**Di GAS editor:**

1. Klik tombol **▶ Run** di `generateRecurringTasks`
2. Tunggu ~10 detik
3. Lihat **Logs** (View → Logs)
4. Pastikan muncul:
   ```
   [RECURRING] Trigger time (Asia/Jakarta): Tue Jul 08 2026 20:30:00
   [RECURRING] Task eligible (last was 24.5h ago): [template_id]
   [WA] Sent task: Kasir Closing
   [RECURRING] Total new tasks created: 4
   ```

---

## 🆘 JIKA ERROR SAAT PASTE

**Error: "Unexpected token"**
- Pastikan tidak ada copy extra (whitespace/special char)
- Delete line lama COMPLETELY, baru paste yang baru

**Error: "Function not found"**
- Cari function name yang benar di GAS script
- Mungkin: `FonnteService.send()` vs `Fonnte.send()` dll

**Error: "Template tidak berubah"**
- Klik **Save** (Ctrl+S)
- Wait 2 detik
- Baru klik Run

---

## 📞 PERLU BANTUAN?

Jika stuck:
1. Screenshot error message
2. Paste di chat
3. Saya bantu debug

Go! 🚀

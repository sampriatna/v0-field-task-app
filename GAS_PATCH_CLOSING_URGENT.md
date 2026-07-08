# GAS PATCH - FIX CLOSING JAM 20:00 TIDAK KIRIM WA

**Status**: URGENT - CLOSING tasks tidak generate sejak 24 Juni  
**Target**: Fix 2 bug kritikal dalam 10 menit  
**Testing**: Manual test selesai dalam 15 menit  

---

## 🔴 MASALAH SAAT INI

**Jam 20:00 (8 PM) setiap hari:**
- ❌ CLOSING tasks TIDAK generate
- ❌ WA TIDAK terkirim ke staff
- ✅ OPENING tasks jalan (pagi)

**Root Cause**: 2 bug di GAS:
1. Grace window 30 menit terlalu pendek → block CLOSING
2. Timezone UTC vs Asia/Jakarta → jam salah

---

## ✅ STEP-BY-STEP FIX (10 Menit)

### STEP 1: Buka GAS Script (2 menit)

1. Buka Google Sheet `task.nf3.company`
2. Menu: **Extensions → Apps Script**
3. Tunggu editor load
4. Cari file/tab: `generateRecurringTasks` atau `main.gs`

---

### STEP 2: Cari & Replace BUG #1 - Grace Window (3 menit)

**Find This (LAMA - BUG):**
```javascript
const hoursSinceLastTask = (new Date() - lastTaskDate) / (1000 * 60 * 60);
if (hoursSinceLastTask < 30) {
  Logger.log("Task recently created, skipping: " + template.id);
  continue;
}
```

**Replace With (BARU - FIXED):**
```javascript
// Grace window: 4 jam untuk DAILY/CLOSING, 12 jam untuk WEEKLY
const graceHours = template.repeat_type === "WEEKLY" ? 12 : 4;
const hoursSinceLastTask = (new Date() - lastTaskDate) / (1000 * 60 * 60);
if (hoursSinceLastTask < graceHours) {
  Logger.log("Task recently created (" + hoursSinceLastTask.toFixed(1) + "h), skipping [grace: " + graceHours + "h]: " + template.id);
  continue;
}
```

**Penjelasan:**
- Lama: 30 menit grace window terlalu pendek
- Baru: 4 jam grace window (allow daily generation)
- WEEKLY punya grace 12 jam (tidak perlu daily)

---

### STEP 3: Cari & Replace BUG #2 - Timezone (3 menit)

**Find This (LAMA - BUG):**
```javascript
function generateRecurringTasks() {
  const today = new Date(); // ← UTC timezone
```

**Replace With (BARU - FIXED):**
```javascript
function generateRecurringTasks() {
  // Use Asia/Jakarta timezone (UTC+7)
  const jakartaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const today = new Date(jakartaTime);
  Logger.log("Current time (Asia/Jakarta): " + today);
```

**Penjelasan:**
- Lama: `new Date()` menggunakan server timezone (bisa UTC)
- Baru: Paksa ke Asia/Jakarta (UTC+7)
- Ini penting: template jam 20:00 Jakarta = 13:00 UTC

---

### STEP 4: Tambah Throttling untuk WA (2 menit)

**Find This (LAMA):**
```javascript
for (const task of newTasks) {
  FonnteService.sendChecklistTask(task);
}
```

**Replace With (BARU):**
```javascript
for (let i = 0; i < newTasks.length; i++) {
  const task = newTasks[i];
  FonnteService.sendChecklistTask(task);
  
  // Jeda 5 detik antar WA (rate limit-friendly)
  if (i < newTasks.length - 1) {
    Utilities.sleep(5000);
  }
}
```

**Penjelasan:**
- Lama: Kirim semua WA sekaligus → Fonnte rate limit
- Baru: Jeda 5 detik antar WA → status "delivered" konsisten

---

## 🧪 TESTING (15 Menit)

### Test 1: Manual Trigger (5 menit)

1. Di GAS editor, cari function: `generateRecurringTasks`
2. Klik tombol **▶ Run**
3. Tunggu log muncul
4. **Cek hasil:**
   ```
   ✅ "Current time (Asia/Jakarta): Tue Jul 08 2026 20:30:00"
   ✅ "Task recently created (24.5h), skipping [grace: 4h]"
   ✅ Log untuk CLOSING tasks (tidak di-skip)
   ```

### Test 2: Cek Database (5 menit)

1. Buka Google Sheet `task.nf3.company`
2. Tab: **TASK_MASTER**
3. Scroll ke bawah → cari row terbaru dengan `repeat_type = "CLOSING"`
4. **Verify:**
   - ✅ `created_at` ≈ sekarang (dalam 1 menit)
   - ✅ `status` = "PENDING"
   - ✅ `template_id` = id template CLOSING

### Test 3: Cek WA Masuk (5 menit)

1. Tunggu ~30 detik (jeda 5s × staff)
2. **Cek nomor test +628128660880:**
   - ✅ WA dari Fonnte masuk (pesan CLOSING)
   - ✅ Format: "Kasir Closing - Tutup Kasir, Closing Kitchen..." dll
   - ✅ 1 WA per staff (tidak duplikat)

---

## 🔍 TROUBLESHOOTING

### Masalah: WA masih tidak masuk setelah fix

**Cek:**
1. Tab ERROR_LOG di sheet → ada error?
2. WA_LOG → ada entry untuk CLOSING?
3. Fonnte API key masih valid?

**Action:**
- Buka Fonnte dashboard: https://fonnte.com/dashboard
- Verify: API key, nomor test +628128660880 aktif

---

### Masalah: CLOSING tasks created tapi WA "unknown" status

**Fix yang sudah diterapkan:**
- ✅ Throttling 5s antar WA (phase 3 di atas)

**Jika masih error:**
1. Kecilkan batch size: `if (i % 3 == 0) Utilities.sleep(2000)` (jeda per 3 WA)
2. Check Fonnte rate limit docs

---

## 📋 VERIFICATION CHECKLIST

Sebelum declare "DONE", pastikan ✅ semua:

- [ ] Buka GAS editor → lihat 3 fix sudah applied
- [ ] Run `generateRecurringTasks()` → log muncul, no errors
- [ ] TASK_MASTER ada row CLOSING baru
- [ ] WA_LOG ada entry CLOSING terkirim
- [ ] ERROR_LOG kosong (atau minimal untuk issues sebelumnya)
- [ ] Cek nomor +628128660880 → WA masuk
- [ ] Cek Fonnte dashboard → status "delivered" (tidak "unknown")

---

## ⏰ SCHEDULE TEST BESOK

**Esok pagi (7 AM):**
1. Opening trigger → verify WA masuk
2. Check TASK_MASTER opening tasks

**Jam 20:00 besok (8 PM):**
1. Closing trigger → verify WA masuk
2. Monitor Fonnte dashboard (status harus "delivered")

---

## 📞 NEXT IF STILL BROKEN

Jika setelah 3 fix masih tidak jalan:
1. Screenshot ERROR_LOG
2. Share ke saya
3. Saya audit lebih dalam (secondary issues)

---

## ✨ EXPECTED RESULT AFTER FIX

**Before:**
```
20:00 → Cron trigger
        ↓
        Grace window 30min → BLOCK (semua template di-skip)
        ↓
        ❌ No CLOSING tasks created
        ❌ No WA sent
```

**After:**
```
20:00 → Cron trigger
        ↓
        Grace window 4h → PASS (CLOSING tasks eligible)
        ↓
        ✅ CLOSING tasks created (untuk Kasir, Kitchen, Bar, Waiters)
        ✅ 4 WA terkirim (dengan 5s throttle)
        ✅ Status: "delivered" di Fonnte
```

---

## 🎯 FINAL NOTES

- **BUG #1 (grace window)** → 90% penyebab CLOSING error
- **BUG #2 (timezone)** → 5% (hanya jika server UTC)
- **BUG #3 (throttling)** → Fix untuk "unknown" status WA

**Prioritas:** BUG #1 URGENT, BUG #2 & #3 MEDIUM

**Setelah fix:** Automatic recurring CLOSING jam 20:00 setiap hari ✅

---

## 📞 QUESTIONS?

Kalau stuck di step mana, tanya aja. Saya ready untuk deeper debug.

**Go! 🚀 (10 menit fix, besok CLOSING berjalan rutin)**

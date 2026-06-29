# PROMPT AUDIT BACKEND GOOGLE APPS SCRIPT (GAS)

> Salin seluruh isi di bawah ini dan tempel ke AI/developer yang memegang kode Google Apps Script.
> Prompt ini dirancang untuk mengaudit backend GAS yang menjadi otak sistem Field Task App
> (membuat tugas, mengirim WhatsApp via Fonnte, menyimpan laporan ke Google Sheets).

---

## KONTEKS SISTEM (WAJIB DIBACA AI/DEVELOPER)

Saya punya aplikasi manajemen tugas lapangan dengan arsitektur:

```
Aplikasi Next.js  →  /api/gas (proxy)  →  Google Apps Script (Web App)  →  Google Sheets
                                                      │
                                                      └──→  Fonnte API  →  WhatsApp staff
```

- **Frontend Next.js TIDAK menyimpan data dan TIDAK mengirim WhatsApp.** Semua logika bisnis ada di GAS.
- GAS menerima request lewat `doGet(e)` dan `doPost(e)` dengan field `action` yang menentukan fungsi mana yang dijalankan.
- Setiap request admin menyertakan `admin_secret` dan `api_key`. Request publik (halaman staff isi laporan) hanya pakai `token`.
- Pengiriman WhatsApp dilakukan oleh `FonnteService.sendNewTask()` dan `FonnteService.sendChecklistTask()`.
- Tugas harian otomatis dibuat oleh fungsi `generateRecurringTasks` yang dipanggil **time-driven trigger** (harian).

**Tujuan audit:** temukan bug, ketidakkonsistenan, dan risiko, lalu beri rekomendasi perbaikan kode yang konkret. JANGAN hanya teori — tunjukkan baris/fungsi dan tulis kode penggantinya.

---

## MASALAH NYATA YANG SEDANG TERJADI (PRIORITAS UTAMA AUDIT)

### MASALAH 1 — Tugas shift CLOSING & template MINGGUAN tidak ter-generate otomatis
- Tugas **OPENING** pagi hari berhasil dibuat + WA terkirim normal.
- Tapi tugas **CLOSING** dan template **WEEKLY** (repeat_days kosong) **tidak pernah dibuat** oleh trigger harian.
- Saat dipanggil manual, log GAS menunjukkan template di-skip dengan alasan seperti `ALREADY_EXISTS` atau `WEEKLY_REPEAT_DAYS_EMPTY`.

**Audit yang diminta untuk fungsi `generateRecurringTasks` dan helper `generateTaskFromTemplateIfNotExists_`:**
1. Bagaimana cara fungsi mengecek "tugas hari ini sudah dibuat atau belum"? Apakah perbandingan tanggal memakai **zona waktu Asia/Jakarta** atau UTC? (Salah timezone bikin tugas dianggap sudah ada padahal belum.)
2. Apakah pengecekan "already exists" membandingkan **template_id + tanggal hari ini**, atau keliru mencocokkan tugas lama tanpa filter tanggal? Tunjukkan baris perbandingannya.
3. Untuk template **WEEKLY**: kalau `repeat_days` kosong, apa yang terjadi? Apakah seharusnya di-skip total atau pakai default? Jelaskan logika `repeat_type` (DAILY/WEEKLY/MONTHLY) dan field `repeat_days`.
4. Untuk template **CLOSING**: apakah ada beda penanganan vs OPENING (mis. berdasarkan `deadline_time` malam hari)? Apakah deadline yang melewati tengah malam dihitung untuk "hari" yang salah?
5. Apakah trigger harian benar-benar masih aktif dan jam berapa ia jalan? Beri cara cek `ScriptApp.getProjectTriggers()`.

### MASALAH 2 — Status WhatsApp di Fonnte "unknown" / pesan tidak sampai walau API sukses
- Setelah generate, field `wa_sent_at` di sheet terisi, tapi di dashboard Fonnte status pesan = **"unknown"** dan sebagian staff tidak menerima WA.
- Sebagian penerima (yang dikirim duluan) menerima, sisanya (dikirim beruntun setelahnya) nyangkut "unknown" — gejala **throttling/burst**.

**Audit yang diminta untuk `FonnteService`:**
1. Apakah kode menganggap "berhasil kirim" hanya dari **HTTP 200 / `status:true` response Fonnte**? Tegaskan bahwa itu **bukan** bukti pesan delivered — itu hanya "diterima antrian Fonnte".
2. Apakah ada **jeda (`Utilities.sleep`)** antar pengiriman saat loop banyak tugas? Kalau tidak ada, ini penyebab throttling. Rekomendasikan jeda yang aman (mis. 3–8 detik per pesan) dan/atau batasi jumlah pesan per eksekusi.
3. Apakah `wa_sent_at` ditulis **sebelum** atau **sesudah** memverifikasi response Fonnte? Apakah ada penanganan kalau Fonnte balas error (mis. `status:false`, `reason`)? Simpan `wa_status` + `wa_reason` ke sheet, jangan cuma timestamp.
4. Apakah nomor tujuan dinormalisasi ke format `62xxxx` (hapus `+`, spasi, `0` depan jadi `62`)? Tunjukkan fungsi normalisasinya.
5. Apakah ada retry untuk pesan yang gagal? Sarankan mekanisme retry/antrian sederhana (mis. simpan status `PENDING/SENT/FAILED` lalu fungsi `retryFailedWhatsApp`).
6. Bedakan dengan jelas dua status: **`wa_sent_at`** (diterima Fonnte) vs **delivered** (sampai ke HP). Sarankan cara cek status delivery (Fonnte webhook/report) bila tersedia.

---

## AUDIT MENYELURUH (LAKUKAN SEMUA)

### A. Kontrak Action (paling penting untuk kestabilan)
Frontend memanggil action-action berikut. Untuk **setiap** action, verifikasi: (a) ada di switch `doGet`/`doPost`, (b) payload yang diterima sesuai, (c) bentuk response `{ success, data }` konsisten, (d) error dikembalikan sebagai `{ success:false, error }` BUKAN throw/HTML.

**Public (tanpa login, pakai token):**
`healthCheck`, `getTaskByToken`, `getTaskDetail`, `markOpened`, `submitTaskReport`, `getChecklistByToken`, `submitChecklistReport`

**Admin (butuh admin_secret):**
`createTask`, `getTasks`, `verifyTask`, `requestRevision`, `resendWhatsApp`, `deleteTask`,
`getRecurringTemplates`, `getRecurringTemplate`, `createRecurringTemplate`, `updateRecurringTemplate`, `toggleRecurringTemplateStatus`, `generateRecurringTasks`,
`getChecklistTemplate`, `getChecklistTemplates`, `createChecklistTemplate`, `updateChecklistTemplate`, `saveChecklistTemplate`,
`getChecklistItems`, `saveChecklistItems`, `generateChecklistReport`,
`getChecklistReports`, `getChecklistDetail`, `getChecklistSummary`, `approveChecklist`, `requestChecklistRevision`, `resendChecklistWhatsApp`,
`getDashboardSummary`,
`getOutlets`, `createOutlet`, `updateOutlet`, `deleteOutlet`,
`getAreas`, `createArea`, `updateArea`, `deleteArea`,
`getCategories`, `createCategory`, `updateCategory`, `deleteCategory`,
`getStaff`, `createStaff`, `updateStaff`, `deleteStaff`, `deactivateStaff`, `activateStaff`,
`loginUser`, `getUsers`, `createUser`, `updateUser`, `deleteUser`

Untuk setiap action, laporkan dalam tabel: **Action | Ada? | Payload cocok? | Response cocok? | Catatan/Bug**.

### B. Konsistensi Data & Field Naming
1. Field status staff: pastikan konsisten satu nama (`active_status` = `"ACTIVE"`/`"INACTIVE"`), jangan campur `is_active`/`status`.
2. Tanggal: pastikan semua `created_at`, `updated_at`, `deadline`, `task_date`, `submitted_at` pakai format & timezone konsisten (Asia/Jakarta, ISO atau format yang sama).
3. Bug yang pernah dicatat: di pembuatan tugas dari template, field `checklist_mode` di-set tapi **tidak ikut di return object**, sehingga routing WA (`sendChecklistTask` vs `sendNewTask`) bisa salah. Verifikasi `checklist_mode`, `checklist_token`, `checklist_link` ikut dikembalikan.
4. Pastikan `getTasks` punya pagination/limit yang jelas dan TIDAK diam-diam memotong data terbaru (mis. default limit 100 yang menyembunyikan tugas hari ini).

### C. Keamanan
1. Validasi `admin_secret`/`api_key` di SEMUA action admin sebelum operasi tulis.
2. Password user: apakah di-hash (bukan plain text di sheet)? Apakah `loginUser` pakai compare yang aman?
3. Token tugas (`token`/`checklist_token`): apakah cukup acak & tidak mudah ditebak? Apakah dicek kecocokannya dengan task_id?
4. Apakah ada potensi action publik (`submitTaskReport`, `submitChecklistReport`) dipakai menulis data tanpa validasi token yang benar?

### D. Reliabilitas & Performa
1. Penggunaan `SpreadsheetApp` di dalam loop (baca/tulis berulang) — sarankan baca sekali (`getDataRange().getValues()`) lalu tulis batch (`setValues()`).
2. `LockService` untuk mencegah race condition saat generate tugas / submit bersamaan.
3. Batas waktu eksekusi GAS (6 menit) — apakah generate massal + kirim WA berisiko timeout? Sarankan batching.
4. Error handling: bungkus tiap action dengan try/catch yang mengembalikan `{ success:false, error: e.message }`.

### E. Trigger & Penjadwalan
1. Daftar semua trigger aktif (`ScriptApp.getProjectTriggers()`), fungsi yang dipicu, dan jadwalnya.
2. Apakah ada trigger ganda/duplikat yang bisa bikin tugas/WA dobel?
3. Pastikan zona waktu project GAS = **Asia/Jakarta** (cek `appsscript.json` → `"timeZone"`).

---

## FORMAT OUTPUT YANG SAYA HARAPKAN

1. **Ringkasan Eksekutif** — 5–10 baris temuan terpenting & dampaknya.
2. **Temuan Kritikal** — untuk MASALAH 1 & 2: akar penyebab + **potongan kode lama** + **potongan kode perbaikan** yang siap tempel.
3. **Tabel Audit Action** (bagian A).
4. **Daftar Bug Lain** (B–E) dengan tingkat keparahan: Kritikal / Tinggi / Sedang / Rendah.
5. **Rencana Perbaikan Berurutan** — langkah 1,2,3 yang harus dikerjakan lebih dulu.
6. **Skrip Uji** — contoh pemanggilan tiap fungsi (mis. lewat `curl` ke Web App URL) untuk memverifikasi perbaikan.

Mohon tunjukkan nama fungsi & nomor baris yang relevan. Jika butuh melihat bagian kode tertentu, sebutkan file/fungsi mana yang perlu saya tempel.

---

## CARA CEPAT MENGUMPULKAN BUKTI (jalankan di Apps Script Editor)

Tempel fungsi-fungsi diagnostik ini ke GAS, jalankan, lalu lampirkan hasilnya saat audit:

```javascript
// 1. Cek timezone project
function _audit_timezone() {
  Logger.log("Spreadsheet TZ: " + SpreadsheetApp.getActive().getSpreadsheetTimeZone());
  Logger.log("Session TZ: " + Session.getScriptTimeZone());
  Logger.log("Now (Jakarta): " + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
}

// 2. Daftar semua trigger aktif
function _audit_triggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    Logger.log(t.getHandlerFunction() + " | " + t.getEventType() + " | " + t.getTriggerSource());
  });
}

// 3. Daftar nama sheet & jumlah baris
function _audit_sheets() {
  SpreadsheetApp.getActive().getSheets().forEach(function (s) {
    Logger.log(s.getName() + " | rows: " + s.getLastRow() + " | cols: " + s.getLastColumn());
  });
}

// 4. Simulasi pengecekan "sudah dibuat hari ini" untuk SEMUA template (tanpa benar-benar kirim WA)
//    Sesuaikan nama fungsi/var dengan kode Anda. Tujuannya melihat template mana yang di-skip & alasannya.
function _audit_recurring_dryrun() {
  // TODO: panggil logika cek-tanggal Anda di sini dan Logger.log alasan skip per template
}
```

---

## CATATAN PENTING UNTUK AUDITOR
- Aplikasi Next.js sudah terbukti **benar** meneruskan request ke GAS (healthCheck `success:true`, WA Udin/Dul terkirim). Jadi fokus audit ada di **logika GAS**, bukan di frontend.
- Jangan sarankan "deploy ulang frontend" sebagai solusi WhatsApp — itu tidak relevan.
- Prioritaskan MASALAH 1 (tugas closing/mingguan tidak dibuat) dan MASALAH 2 (throttling/status unknown WhatsApp) karena itu yang berdampak harian ke operasional.

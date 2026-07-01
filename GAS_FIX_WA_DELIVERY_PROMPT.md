"# GAS Fix — WhatsApp hanya sampai ke 1 orang padahal `wa_sent_at` terisi untuk semua

## Konteks sistem
- Arsitektur: Next.js app -> Google Apps Script (GAS) Web App -> Fonnte API -> WhatsApp.
- Fungsi kirim WA ada di GAS (`FonnteService.sendNewTask()` / `sendChecklistTask()` atau sejenisnya).
- Token Fonnte disimpan di **Script Properties** GAS.

## Gejala (dikonfirmasi dari data live)
- Recurring task 01/07/2026 sudah ter-generate normal untuk semua PIC (Dapur, Bar, Waiters, dll).
- **Kolom `wa_sent_at` TERISI untuk SEMUA task** (contoh timestamp: 02:05, 02:06, 02:36, 13:05 dst, sudah ada jeda ~8 detik antar kirim, jadi bukan throttling).
- **Tapi WhatsApp secara nyata hanya sampai ke 1 orang (Udin).**
- Fonnte TERBUKTI berfungsi: token lain yang dites user berhasil kirim. Jadi device/Fonnte bukan penyebab.

## Hipotesis utama (mohon diverifikasi di kode GAS)
1. **GAS menandai `wa_sent_at` TANPA memeriksa respons balasan Fonnte.**
   - Kemungkinan kode saat ini: memanggil `UrlFetchApp.fetch(...)` lalu langsung menulis `wa_sent_at = now()` tanpa membaca `response.getResponseCode()` atau body JSON `{status: true/false, reason: ...}`.
   - Akibat: kalau Fonnte menolak (token salah/device beda/nomor invalid), GAS tetap menganggap sukses.
2. **Token Fonnte di Script Properties GAS bukan token yang terbukti jalan** (token lama/stale milik device yang putus).

## Yang diminta
### A. Verifikasi & perbaiki token
- Tampilkan cara membaca token Fonnte yang sedang dipakai dari Script Properties (JANGAN cetak token penuh; cukup 4 digit terakhir + panjang string).
- Pastikan token itu SAMA dengan token yang user konfirmasi berhasil. Sediakan fungsi `setFonnteToken(newToken)` untuk memperbarui Script Property dengan aman.

### B. Baca & simpan respons Fonnte yang sebenarnya (INTI PERBAIKAN)
Ubah fungsi pengirim agar:
1. Set `muteHttpExceptions: true` pada `UrlFetchApp.fetch`.
2. Baca `response.getResponseCode()` DAN parse body JSON Fonnte.
3. Fonnte sukses HANYA jika HTTP 200 DAN body `status === true`. Selain itu = GAGAL.
4. Simpan hasil per-penerima:
   - `wa_sent_at` HANYA diisi jika benar-benar sukses.
   - Tambah/isi kolom status, mis. `wa_status` = `SENT` / `FAILED`, dan `wa_error` = isi `reason`/pesan error dari Fonnte (mis. \"device not connected\", \"invalid target\", dsb).
5. Log tiap pengiriman ke Logger/console: nama PIC, 4 digit akhir nomor, HTTP code, status, reason.

Contoh pola yang diinginkan (sesuaikan dgn kode nyata):
```javascript
function sendFonnte(target, message) {
  var token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  var res = UrlFetchApp.fetch('https://api.fonnte.com/send', {
    method: 'post',
    headers: { 'Authorization': token },
    payload: { target: target, message: message },
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var body = {};
  try { body = JSON.parse(res.getContentText()); } catch (e) {}
  var ok = code === 200 && body.status === true;
  Logger.log('WA -> ' + target.slice(-4) + ' | http:' + code + ' | status:' + body.status + ' | reason:' + (body.reason || ''));
  return { ok: ok, code: code, reason: body.reason || res.getContentText() };
}
```
Lalu di loop generate: hanya set `wa_sent_at` kalau `result.ok === true`, else set `wa_status='FAILED'` + `wa_error=result.reason`.

### C. Fungsi diagnostik one-time
Buat fungsi `retryTodayWa()` yang:
- Ambil semua task hari ini yang `wa_status` != 'SENT' (atau `wa_sent_at` kosong setelah perbaikan).
- Kirim ulang satu per satu dengan `Utilities.sleep(8000)`.
- Kembalikan ringkasan: berapa SENT, berapa FAILED beserta reason per nomor.

## Output yang diharapkan
1. Ringkasan akar masalah (token stale vs respons tidak dibaca — sebutkan yang benar setelah cek kode).
2. Kode lama vs kode baru untuk fungsi pengirim.
3. Konfirmasi kolom sheet yang perlu ditambah (`wa_status`, `wa_error`) jika belum ada.
4. Hasil test `retryTodayWa()` dengan reason nyata dari Fonnte per penerima.

## Catatan
- JANGAN ubah aplikasi Next.js — sisi frontend sudah benar (menampilkan `WA_FAILED` bila statusnya itu).
- Jangan cetak token penuh di log.
"

# Prompt Debug untuk Claude — `submitChecklistReport` di Google Apps Script (GAS)

Salin-tempel seluruh blok di bawah ini ke Claude, lalu lampirkan file `Code.gs` (atau file Apps Script yang berisi handler `submitChecklistReport` dan fungsi router `doPost`/`doGet`).

---

## PROMPT (copy mulai dari sini)

Saya punya backend Google Apps Script (GAS) yang dipublish sebagai Web App dan dipanggil dari aplikasi Next.js. Untuk action lain (mis. `getChecklistByToken`) sudah berfungsi — checklist bisa dimuat. Tetapi saat staff menekan **KIRIM LAPORAN**, GAS mengembalikan respons gagal **tanpa pesan error**, sehingga frontend menampilkan layar "Tidak Dapat Dibuka" yang kosong.

### Kontrak request yang dikirim frontend

Request dikirim sebagai **HTTP POST** dengan `Content-Type: application/json`. Body JSON-nya:

```json
{
  "action": "submitChecklistReport",
  "task_id": "TASK-20260614-0001",
  "token": "98f26774b8c043a89d8bbbd2016ae440fea2725a9c6246da",
  "checked_items": [
    { "checklist_item_id": "CHK-xxx-01", "is_checked": true, "photo_url": "data:image/jpeg;base64,...." },
    { "checklist_item_id": "CHK-xxx-02", "is_checked": true, "photo_url": null }
  ],
  "after_photo_base64": "data:image/jpeg;base64,....",   // opsional, bisa tidak ada
  "staff_note": "catatan opsional",                       // opsional, bisa tidak ada
  "admin_secret": "<ADMIN_API_KEY>",
  "api_key": "<ADMIN_API_KEY>"
}
```

Catatan penting tentang data:
- `checked_items` adalah array objek. Field `photo_url` berisi **data URI base64** (`data:image/jpeg;base64,...`) untuk item yang wajib foto, atau `null`/kosong untuk yang tidak.
- `after_photo_base64` juga **data URI base64** dan bersifat **opsional** (boleh tidak dikirim).
- Foto sudah dikompres di sisi klien (maks 1280px, JPEG q0.7), jadi ukurannya kecil (~100-300KB per foto), tetapi gabungan beberapa foto base64 tetap bisa beberapa ratus KB.

### Respons yang diharapkan frontend

Sukses:
```json
{ "success": true }
```

Gagal (harus SELALU menyertakan pesan):
```json
{ "success": false, "error": "pesan jelas kenapa gagal" }
```

### Yang saya butuhkan dari kamu (Claude)

1. **Telусuri root cause** kenapa `submitChecklistReport` mengembalikan kegagalan tanpa pesan. Kandidat penyebab yang harus kamu cek:
   - `doPost(e)` mem-parse body dengan benar? (`JSON.parse(e.postData.contents)`)
   - Validasi `task_id` + `token`: apakah token dicocokkan ke baris task yang benar? Apakah gagal diam-diam saat task tidak ketemu?
   - Penulisan/upload foto base64 ke Google Drive: apakah `Utilities.base64Decode` + `DriveApp.createFile(blob)` dipanggil dengan benar? Apakah prefix `data:image/jpeg;base64,` sudah di-strip sebelum decode? (kalau tidak di-strip, decode akan menghasilkan file rusak atau exception)
   - Apakah ada `try/catch` yang menelan exception lalu `return { success: false }` tanpa mengisi `error`?
   - Timeout / kuota Drive saat menyimpan beberapa foto sekaligus?
   - Penulisan ke Sheet: nama sheet/kolom benar? Apakah `appendRow`/`setValues` cocok dengan jumlah kolom?

2. **Perbaiki handler** agar:
   - Setiap cabang kegagalan **selalu** mengembalikan `{ success: false, error: "<alasan spesifik>" }` (tidak pernah kosong).
   - Bungkus seluruh handler dengan `try/catch`, dan di `catch` kembalikan `{ success: false, error: String(err && err.stack || err) }`.
   - Strip prefix data URI (`data:image/...;base64,`) sebelum `Utilities.base64Decode`.
   - Tangani `after_photo_base64` dan `staff_note` yang opsional (boleh kosong/undefined).
   - Tetap mengembalikan `{ success: true }` saat berhasil.

3. **Tambahkan logging** dengan `Logger.log`/`console.log` di tiap langkah penting (parse, validasi token, tiap upload foto, tulis sheet) supaya bisa dilihat di **Executions** GAS.

4. Pastikan response dikirim via `ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON)`.

5. Berikan **kode `submitChecklistReport` yang sudah diperbaiki secara lengkap**, plus fungsi util upload foto, dan tunjukkan di mana menempatkannya dalam router `doPost`.

Saya lampirkan file Apps Script saya. Tolong analisis, jelaskan akar masalah dengan ringkas, lalu berikan kode perbaikannya.

## (copy sampai sini)

---

### Cara mengambil log eksekusi GAS (untuk dilampirkan ke Claude bila perlu)
1. Buka project Apps Script → menu kiri **Executions**.
2. Cari eksekusi `doPost` paling baru yang gagal / berwarna merah.
3. Klik untuk melihat stack trace dan `Logger.log` output.
4. Salin teksnya dan tempel ke Claude bersama prompt di atas.

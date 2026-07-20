# Staff Static Report Link — Kegiatan Standar (SOP)

Fitur pelengkap daily report. **Bukan laporan teks bebas.** Staff mengikuti standar kerja: checklist + foto + status kondisi.

## Dua lapisan (wajib dipisah)

| Lapisan | Untuk apa | Cara kerja |
|---------|-----------|------------|
| **Task lama** | Pekerjaan yang diberikan admin/leader | Deadline, revisi, approval, foto before-after, WA |
| **Daily Activity SOP** | Kegiatan standar harian per SDM | Link pribadi `/r/[token]`, checklist, foto, submit — tanpa WA tiap hari |

Fitur baru **bukan pengganti** task lama.

## Prinsip

Staff jangan dikasih kolom kosong. Staff dikasih standar kerja → centang → audit.

## Performa (sat set)

- Public `/r/[token]` & submit **tidak menunggu GAS**
- Buka form kegiatan = instan (tanpa network)
- Setelah submit: update lokal + flash OK (tidak reload penuh)
- Feedback klik: `active:scale`, spinner hanya saat kirim
- Admin sync staff dari data yang sudah di-fetch client

## Super Admin (editable)

Hub: `/settings/daily-activity`

- Edit template kegiatan + checklist
- Generate / revoke link staff
- Dashboard audit

## Halaman

| Route | Fungsi |
|-------|--------|
| `/r/[token]` | Daftar kegiatan → form checklist SOP |
| `/dashboard/daily-reports` | Audit: % checklist, kondisi, warna status |
| `/settings/daily-activity` | Hub super admin |
| `/settings/report-templates` | CRUD kegiatan + checklist |
| `/settings/report-links` | Generate / revoke link |

## Warna dashboard

- **Hijau** — selesai lengkap (Aman)
- **Kuning** — selesai ada kendala
- **Merah** — belum submit (wajib)
- **Abu** — tidak wajib

## Demo seed

| Staff | Posisi | Path |
|-------|--------|------|
| Rina | Waiters | `/r/b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011` |
| Ani | Bar | `/r/c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122` |
| Budi | Dapur | `/r/a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00` |

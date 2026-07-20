# Staff Static Report Link — Kegiatan Standar (SOP)

Fitur pelengkap daily report. **Bukan laporan teks bebas.** Staff mengikuti standar kerja: checklist + foto + status kondisi.

## Prinsip

Staff jangan dikasih kolom kosong. Staff dikasih standar kerja → centang → audit.

Setiap kegiatan punya:
1. Nama kegiatan
2. Standar hasil
3. Checklist kerja
4. Bukti foto (jika wajib)
5. Status kondisi (Aman / Kendala ringan / Follow up leader / Perlu belanja)
6. Catatan kendala (tambahan; wajib hanya jika bukan Aman)

## Jenis report

1. **Wajib harian** — muncul otomatis per `position_group` (Waiters / Bar / Dapur)
2. **Pekerjaan khusus** — template non-daily / special
3. **Lapor kendala** — tombol cepat (`kind: issue_quick`)

## Halaman

| Route | Fungsi |
|-------|--------|
| `/r/[token]` | Daftar kegiatan → form checklist SOP |
| `/dashboard/daily-reports` | Audit: % checklist, kondisi, warna status |
| `/settings/report-templates` | CRUD kegiatan + checklist items |
| `/settings/report-links` | Generate / revoke link permanen |

## Warna dashboard

- **Hijau** — selesai lengkap (Aman)
- **Kuning** — selesai ada kendala
- **Merah** — belum submit (wajib)
- **Abu** — tidak wajib untuk posisi itu

## Demo seed links

| Staff | Posisi | Token path |
|-------|--------|------------|
| Budi | Cook → Dapur | `/r/a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00` |
| Rina | Server → Waiters | `/r/b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011` |
| Ani | Barista → Bar | `/r/c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122` |

## Schema (PostgreSQL)

Lihat `docs/V2_DATABASE_SCHEMA.md`:
- `report_templates`
- `report_template_checklist_items`
- `daily_report_submissions` (`status_condition`)
- `daily_report_checklist_answers`

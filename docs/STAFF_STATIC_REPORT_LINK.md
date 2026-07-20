# Staff Static Report Link

Fitur pelengkap daily report cepat untuk Nusa Food. **Tidak mengganti sistem task utama.**

## Ringkas

1. Admin generate link permanen per staff → `/r/[token]`
2. Staff buka link tanpa login penuh
3. Pilih template report (filter outlet + jabatan), isi catatan, upload foto bila perlu
4. Submit → `daily_report_submissions`
5. Admin lihat di `/dashboard/daily-reports`

## Halaman

| Route | Akses | Fungsi |
|-------|-------|--------|
| `/r/[token]` | Publik | Form report staff |
| `/dashboard/daily-reports` | Admin | Dashboard + filter |
| `/settings/report-links` | Admin | Generate / revoke link |
| `/settings/report-templates` | Admin | CRUD template |
| `/settings/staff` | Admin | Tombol generate link per staff |

## Demo token (seed lokal)

Staff Budi (Cook, KBU):

```
/r/a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00
```

## Security

- Token: 64 hex chars (`crypto.randomBytes(32)`)
- Token nonaktif ditolak
- `staff_id` dari token saja
- Template divalidasi terhadap outlet & position staff

## Persistensi

Store in-memory (`lib/staff-report-store.ts`) untuk demo/dev.  
Produksi: migrasi ke PostgreSQL sesuai `docs/V2_DATABASE_SCHEMA.md` (tabel `staff_report_links`, `report_templates`, `daily_report_submissions`).

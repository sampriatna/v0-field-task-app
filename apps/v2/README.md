# Nusa Food Task System — v2 (skeleton)

Kerangka awal v2 (Next.js 16 + REST API + PostgreSQL via Prisma). Dikembangkan **paralel**
dengan v1 di repo yang sama. **v1 (root repo) tidak terpengaruh** — v2 hidup sepenuhnya di
folder `apps/v2/` dengan `package.json`, `tsconfig.json`, dan dependency sendiri.

Rujukan desain: lihat `docs/V2_*.md` di root repo (schema, API spec, strategi migrasi, rollback).

## Isi Sprint 1 (fondasi)

- `prisma/schema.prisma` — schema PostgreSQL lengkap (terjemahan dari `docs/V2_DATABASE_SCHEMA.md`)
- `prisma/seed.ts` — seed outlets, areas, categories dari enum v1
- `lib/db.ts` — Prisma client singleton
- `app/api/health/route.ts` — `GET /api/health` (liveness + cek koneksi DB)
- Skeleton Next.js (`app/layout.tsx`, `app/page.tsx`)

## Menjalankan

Prasyarat: Node 20+, PostgreSQL (lokal atau Supabase), pnpm/npm.

```bash
cd apps/v2
cp .env.example .env        # isi DATABASE_URL
npm install                 # atau pnpm install
npm run db:generate         # prisma generate
npm run db:migrate          # buat tabel (dev)
npm run db:seed             # isi master data
npm run dev                 # http://localhost:3001
```

Cek: `curl http://localhost:3001/api/health`

Port sengaja `3001` supaya tidak bentrok dengan v1 (`3000`) saat jalan bersamaan.

## Belum dikerjakan (sprint berikutnya)

Read/Write API tasks, checklist, recurring, auth multi-user, upload foto ke storage,
adapter GAS + dual-write. Lihat roadmap di `docs/V2_REPO_STRUCTURE.md`.

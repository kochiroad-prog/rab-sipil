# Estimator Sipil & Konstruksi

Aplikasi web untuk menyusun RAB (Rencana Anggaran Biaya) pekerjaan sipil & konstruksi:
kalkulator RAB per proyek, database referensi AHSP (harga satuan pekerjaan), manajemen
multi-proyek, dan asisten AI (via OpenRouter) untuk membantu menyusun draft item pekerjaan.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- Supabase (Postgres + Auth + RLS)
- OpenRouter (AI, model default: `openai/gpt-4o-mini`, bisa diganti di `src/lib/openrouter.ts`)
- Deploy: Vercel

## Setup Lokal

1. Install dependencies:
   ```bash
   npm install
   ```

2. Salin `.env.example` ke `.env.local` lalu isi:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   OPENROUTER_API_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   - Supabase URL & anon key: Project Settings → API di dashboard Supabase.
   - OpenRouter API key: https://openrouter.ai/keys

3. Jalankan migrasi database ke project Supabase kamu. Bisa lewat Supabase CLI:
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   atau tempel isi `supabase/migrations/0001_init.sql` langsung di SQL Editor Supabase.

4. Jalankan dev server:
   ```bash
   npm run dev
   ```
   Buka http://localhost:3000

## Struktur Proyek

```
src/
  app/
    (auth)/login, (auth)/register    -> halaman & server actions autentikasi
    (dashboard)/dashboard            -> ringkasan
    (dashboard)/projects             -> daftar & buat proyek
    (dashboard)/projects/[id]        -> kalkulator RAB per proyek
    (dashboard)/ahsp                 -> database referensi AHSP
    api/ai/suggest                   -> endpoint AI (OpenRouter)
  components/AiAssist.tsx            -> widget asisten AI di halaman proyek
  lib/supabase/                      -> client browser, server, middleware
  lib/openrouter.ts                  -> wrapper panggilan OpenRouter
  types/database.ts                  -> tipe TypeScript sesuai skema DB
supabase/migrations/0001_init.sql    -> skema tabel + RLS + seed kategori AHSP
```

## Catatan

- Data AHSP pada seed migration hanya kategori contoh (Pekerjaan Persiapan, Tanah, Pondasi,
  dst) — belum ada harga satuan riil. Isi/update harga sesuai AHSP daerah & tahun berjalan
  (mis. mengacu SNI/Permen PUPR terbaru) lewat halaman **Database AHSP** di aplikasi.
- RLS aktif di semua tabel: user hanya bisa melihat/mengubah proyek & item AHSP miliknya
  sendiri; item AHSP dengan `owner_id = null` adalah data referensi bersama (read-only).

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Import project di Vercel, set environment variables yang sama seperti `.env.local`.
3. Deploy. Domain production tambahkan ke `NEXT_PUBLIC_APP_URL`.

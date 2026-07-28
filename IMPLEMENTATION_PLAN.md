# Rencana Implementasi — Estimator Sipil & Konstruksi

Stack: Next.js (App Router) + Tailwind CSS + Supabase (DB/Auth) + OpenRouter (AI) + GitHub + Vercel.

## Status: Fase 0 selesai (scaffold lokal)

Sudah dibuat dan lolos `tsc --noEmit`, `next build`, `eslint`:
- Struktur Next.js + Tailwind v4, TypeScript strict.
- Skema Supabase (`supabase/migrations/0001_init.sql`): `profiles`, `ahsp_categories`,
  `ahsp_items`, `ahsp_components`, `projects`, `rab_items` — lengkap dengan RLS per-user.
- Auth email/password (Supabase Auth) + middleware proteksi route `/dashboard`, `/projects`, `/ahsp`.
- Kalkulator RAB: tambah item manual atau dari referensi AHSP, hitung subtotal + PPN + total otomatis.
- Database AHSP: CRUD item referensi milik user, baca data referensi bersama.
- Asisten AI (`/api/ai/suggest` via OpenRouter): input deskripsi pekerjaan → draft item RAB (nama, satuan, estimasi volume).
- Git repo lokal + commit awal.

## Fase 1 — Hubungkan ke Supabase project asli

1. Isi `.env.local` dari `.env.example` dengan URL & anon key project Supabase kamu.
2. Push migration: `supabase link --project-ref <ref>` lalu `supabase db push`,
   atau paste `supabase/migrations/0001_init.sql` ke SQL Editor.
3. Cek RLS aktif & policy sesuai (`get_advisors` / manual review di dashboard Supabase).
4. Test alur: register → login → buat proyek → tambah item RAB → logout.

## Fase 2 — Isi data AHSP riil

- Ganti/lengkapi kategori & harga satuan di halaman **Database AHSP** dengan acuan lokal
  terbaru (SNI/Permen PUPR/HSPK daerah setempat) — seed di migration cuma kerangka kategori.
- Opsional: import massal via SQL/CSV kalau datanya banyak (bisa lewat Supabase Table Editor).

## Fase 3 — OpenRouter

- Buat API key di https://openrouter.ai/keys, isi `OPENROUTER_API_KEY`.
- Model default `openai/gpt-4o-mini` di `src/lib/openrouter.ts` — ganti sesuai budget/kebutuhan
  (OpenRouter mendukung banyak model, termasuk yang gratis untuk testing).
- Setelah stabil, bisa ditambah: parsing hasil AI langsung jadi baris RAB (saat ini masih preview),
  atau fitur "review RAB" (AI cek kewajaran harga/volume).

## Fase 4 — Push ke GitHub

```bash
git remote add origin <url-repo-github>
git branch -M main
git push -u origin main
```

## Fase 5 — Deploy ke Vercel

1. Import repo GitHub di Vercel.
2. Set environment variables (sama seperti `.env.local`) di Project Settings → Environment Variables.
3. Deploy — cek build log kalau ada error env yang belum ke-set.
4. Tambahkan domain production ke `NEXT_PUBLIC_APP_URL` lalu redeploy.

## Fase 6 — Iterasi lanjut (opsional, belum dikerjakan)

- Export RAB ke PDF/Excel.
- Edit inline (bukan cuma tambah/hapus) untuk item RAB.
- Login Google (OAuth) di samping email/password.
- Rincian komponen AHSP (bahan/upah/alat) — tabel `ahsp_components` sudah ada di skema, UI belum dibuat.
- Riwayat perubahan / versi RAB per proyek.

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

## Fase 6 — Fitur lanjutan (referensi BikinRAB.id) — selesai

Migration `0002_tkdn_volume_categories.sql` dan `0003_project_overhead.sql` sudah diterapkan ke Supabase.
Lolos `tsc --noEmit`, `next build`, `eslint`, dan export Excel sudah diuji dengan data dummy
(formula di-recalculate pakai LibreOffice headless, hasil sudah dicek benar).

- **Export RAB ke Excel** (`/api/projects/[id]/export`, logic di `src/lib/export-excel.ts`):
  4 sheet formula-linked — Informasi, Rincian RAB (BoQ per kategori + SUBTOTAL), Rekapitulasi
  (referensi ke Rincian RAB, PPN, pembulatan), Rekapitulasi TKDN. Struktur & nama sheet mengikuti
  contoh `sample.xls` dari BikinRAB.id yang dibagikan user.
- **TKDN**: field `tkdn_percent` di `ahsp_items`, `rab_items`, `ahsp_components`. Nilai TKDN proyek
  dihitung rata-rata tertimbang (bukan metodologi resmi Nilai Gabungan Barang & Jasa Permen PUPR —
  itu butuh breakdown material/upah/alat lengkap per AHSP yang belum ada datanya).
- **Backup Volume** (`/projects/[id]/volume`): generator volume beton/bekisting/besi dari dimensi
  kolom/balok/sloof/plat (`src/lib/volume-calc.ts`), bisa dikirim langsung jadi baris RAB.
- **Kategori AHSP resmi**: Bina Marga/Cipta Karya/Sumber Daya Air/Umum ditambahkan ke `ahsp_categories`
  + filter di halaman Database AHSP.
- **Pengaturan proyek**: PPN%, Overhead & Profit%, Tahun Anggaran per proyek (dipakai di sheet Informasi).
- **Edit harga & TKDN inline** langsung di tabel Rincian RAB (klik nilai harga).

### Keterbatasan yang perlu diketahui

- **Database AHSP 5.8K+ item resmi tidak diisi otomatis** — itu data berlisensi/proprietary milik
  BikinRAB.id, tidak bisa saya fabrikasi. Tabel `ahsp_items`/`ahsp_components` sudah siap menampung,
  tapi pengisian harga & koefisien tetap manual/import oleh user.
- **AHSP/HSD sheet (breakdown bahan-upah-alat per pekerjaan) belum digenerate** di Excel export karena
  `ahsp_components` di database masih kosong (belum ada UI untuk isi komposisi per item AHSP). Kalau
  mau dibangun: perlu (1) UI input komposisi bahan/upah/alat per `ahsp_item`, lalu (2) sheet AHSP +
  HSD Upah/Bahan/Alat di export mengikuti pola formula `='HSD Bahan'!E4` seperti contoh asli.
- **TKDN yang ditampilkan adalah estimasi sederhana**, bukan perhitungan resmi tender (yang butuh
  pemisahan Barang/Jasa Dalam Negeri vs Luar Negeri per komponen).

## Fase 7 — Iterasi lanjut (opsional, belum dikerjakan)

- UI komposisi AHSP (bahan/upah/alat per item) + sheet AHSP/HSD di export Excel.
- Perhitungan TKDN resmi (Nilai Gabungan Barang & Jasa sesuai Permen PUPR).
- Export ke PDF.
- Login Google (OAuth) di samping email/password.
- Riwayat perubahan / versi RAB per proyek.
- Drag-and-drop reorder kategori/item RAB (saat ini urutan ikuti waktu input).

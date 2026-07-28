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

## Fase 7 — Adaptasi arsitektur Estima AI (aplikasi interior kakak proyek ini) ke Sipil

Referensi: `D:\RABESTIMA` (Estima AI, aplikasi RAB interior/furniture yang sudah production).
Polanya dipakai, bukan kodenya — domain material/costing furniture beda total dari sipil.
Urutan prioritas dari user: (1) Material DB + AHSP, (2) AI Estimator vision, (3) Manpower, (4) Purchasing.

### 7.1 — Material DB Sipil + komposisi AHSP (fondasi, dikerjakan lebih dulu)

Analog `materials` + `takeoff.ts` milik Estima AI, versi konstruksi:
- Tabel baru `materials` (katalog bahan mentah: semen, pasir, kerikil, besi beton per diameter,
  bata/batako, keramik, cat, dst) dengan metadata konversi satuan per kategori:
  `linear` (besi, panjang batang standar 12m), `sheet` (multiplek bekisting), `coverage`
  (cat, daya sebar m²/kg), `count` (bata/keramik per m²), `bulk` (semen sak, pasir/kerikil m³).
  `aliases[]` untuk fuzzy matching seperti `material_mappings` di Estima AI.
- UI komposisi AHSP: form tambah baris `ahsp_components` (bahan/upah/alat + koefisien) per
  `ahsp_item` — ini yang bikin tabel `ahsp_components` (sudah ada di skema sejak awal) akhirnya
  terisi, sekaligus mengaktifkan sheet AHSP + HSD Upah/Bahan/Alat yang masih kosong di export Excel.
- `lib/takeoff-sipil.ts`: hitung kebutuhan beli per material dari total pemakaian di seluruh RAB
  proyek (agregat lintas item, dibulatkan ke satuan utuh — sak/lembar/batang), pola dual-basis
  sama seperti Estima AI (`purchase_qty` vs `qty` proporsional untuk HPP).

### 7.2 — AI Estimator Sipil (vision + template hibrida)

Analog `openrouter.ts` (2 tahap: deteksi → tanya) + Knowledge DB (`furniture_templates`):
- Tabel `job_templates` + `job_template_questions` + `job_template_components`: Template Pekerjaan
  standar (mis. "Pondasi Batu Kali", "Kolom Praktis 15x15", "Dinding Bata Merah") dengan pertanyaan
  tetap (mutu beton, tinggi, dst) dan komposisi AHSP baku — dicocokkan by keyword ke hasil deteksi AI,
  sama seperti `matchTemplate()`.
- Alur baru: upload foto/gambar kerja → AI baca & sebut jenis pekerjaan + dimensi yang terbaca +
  pertanyaan klarifikasi (gabungan template + AI) → user jawab → draft rincian RAB (name, satuan,
  volume, referensi AHSP) → user verifikasi → masuk `rab_items`. AI tetap TIDAK menghitung
  kuantitas/biaya final — itu tetap tugas Rule Engine (Backup Volume / take-off).
- Beda penting dari furniture: sumber gambar biasanya denah/potongan multi-halaman, bukan satu foto
  produk — prompt & parsing perlu didesain untuk itu, bukan copy prompt furniture.

### 7.3 — Manpower Engine Sipil

Analog Labour DB + Work Activities + AI Manpower Engine (Phase 2+3) Estima AI:
- Upgrade `labours` (kalau nanti ada tabel tukang) dengan kategori tukang batu/besi/kayu bekisting/
  mandor/operator alat, level, produktivitas.
- Tabel `work_activities`: mapping kategori pekerjaan sipil → aktivitas kerja → skill →
  produktivitas (m³/hari, m²/hari, dst).
- AI 3-layer sama seperti Estima AI: analisa kebutuhan kerja dari RAB → rencana tim (jumlah orang,
  hari, biaya) → simulasi borongan vs harian. Deadline simulator (rescale tanpa AI call baru) dan
  Gantt chart bisa dipakai hampir 1:1, cuma datanya beda.
- Fase belajar (opsional, lanjutan): simpan realisasi produktivitas aktual per proyek, update
  koefisien AHSP tenaga kerja dengan rata-rata tertimbang — pola sama seperti `learning_records`
  Estima AI (weight histori vs data baru).

### 7.4 — Purchasing + Material Matching

Analog modul Purchasing + `material_mappings` Estima AI:
- Generate rekap kebutuhan beli dari `takeoff-sipil.ts` (lintas semua item RAB dalam satu proyek,
  bahkan lintas beberapa proyek kalau perlu skala ekonomi), dibulatkan ke satuan beli utuh.
- Fuzzy matching nama material dari `rab_items`/AHSP ke `materials` (skema scoring: cocok
  tipe+ukuran+angka, sama seperti `scoreMaterial()`), dengan opsi mapping manual kalau AI/skor gagal.
- Fase lanjut: supplier database + histori harga per supplier (seperti Material Price Intelligence
  Estima AI), lalu generate PO.

### Catatan desain — apa yang TIDAK diadaptasi

- Costing HPP+overhead%+profit% (Estima AI) tidak menggantikan model AHSP+PPN yang sudah benar untuk
  tender — kalau nanti ada proyek swasta/non-tender, bisa ditambah sebagai mode opsional, bukan default.
- Cutting list parametrik (`parametric.ts`, formula W/D/H/T panel furniture) tidak relevan — analognya
  di sipil sudah dikerjakan lewat Backup Volume (Fase 6) dengan formula sendiri (beton/bekisting/besi).
- Multi-tenant per perusahaan (`companies`, RLS `auth_company_id()`) belum diadopsi — RAB Sipil masih
  single-user per `owner_id`. Kalau nanti butuh kolaborasi tim, ini perlu migration terpisah yang cukup
  besar (ubah semua RLS policy dari owner_id ke company_id).

## Fase 8 — Iterasi lanjut lainnya (belum diprioritaskan)

- Perhitungan TKDN resmi (Nilai Gabungan Barang & Jasa sesuai Permen PUPR) — butuh Fase 7.1 selesai dulu.
- Export ke PDF.
- Login Google (OAuth) di samping email/password.
- Riwayat perubahan / versi RAB per proyek.
- Drag-and-drop reorder kategori/item RAB (saat ini urutan ikuti waktu input).

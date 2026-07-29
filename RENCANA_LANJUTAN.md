# Rencana Implementasi Lanjutan — Estimator Sipil (mengacu RAB Estima)

> Status: **RENCANA (belum dieksekusi)**
> Metodologi: audit **read-only** terhadap kode (`D:\RABESTIMA`) dan skema Supabase project
> `rabestima` (`kezhhpfakqwamhlzdrob`) sebagai referensi menu & data model. **Tidak ada satu pun
> file atau baris DB RAB Estima yang diubah** untuk menyusun dokumen ini.
> Disusun: 29 Juli 2026

---

## 1. Prinsip Adaptasi

RAB Estima dibangun untuk bisnis **furniture/interior** (per-unit, komponen parametrik, harga
jual vs HPP). Estimator Sipil berbasis **AHSP/volume pekerjaan konstruksi** (per-m³/m²/m¹,
Rule Engine deterministik dari AHSP × volume). Jadi menu disamakan **secara fungsi**, bukan
disalin schema-nya mentah-mentah. Tiga penyesuaian penting:

1. **Multi-tenant → solo.** RAB Estima pakai `company_id` (multi-perusahaan). Estimator Sipil
   tetap pakai `owner_id` (sesuai keputusan sebelumnya: solo user).
2. **Purchasing: live vs tersimpan.** RAB Estima menyimpan `purchase_items` sebagai baris yang
   bisa diedit manual. Estimator Sipil **menghitung Purchasing on-the-fly** dari AHSP-komposisi ×
   volume RAB (tidak ada tabel tersimpan) — ini prinsip Rule Engine yang sudah bagus dan **tidak
   diubah**. Untuk fitur PO/Invoice/Pembayaran, yang disimpan adalah **snapshot saat "Buat PO"**,
   bukan seluruh daftar purchasing.
3. **Retensi & termin lebih relevan di sipil** daripada furniture (retensi/jaminan pemeliharaan
   5%, termin borongan tukang) — beberapa kolom yang di RAB Estima terasa "tambahan", di sipil
   justru inti.

---

## 2. Perbandingan Menu

| Menu RAB Estima | Status di Estimator Sipil | Catatan |
|---|---|---|
| Dashboard, Project | Ada | — |
| AI Estimator (riwayat lintas proyek) | Ada, tapi nempel di halaman proyek (VisionEstimator), tanpa riwayat lintas-proyek | opsional kecil, bukan prioritas |
| AI Manpower (top-level) | Ada per-proyek (Fase 7.3) — sudah setara/lebih detail | — |
| Material | Ada, malah lebih lengkap (dimensi/kind utk take-off) | — |
| Supplier | Ada | — |
| Tenaga Kerja + Work Activities | Ada, digabung 1 halaman | sudah cukup, tidak perlu dipisah |
| Knowledge DB (parametrik + auto-learn) | Padanan: Job Template + Resep Volume (formula geometris, bukan komponen furniture) | sudah sesuai konteks sipil |
| Gudang (stok, barang masuk/keluar) | **Sengaja tidak dibangun** (keputusan: beli langsung per-proyek) | tidak berubah |
| Peralatan + Peminjaman | Ada (`/equipment`), sudah termasuk TTD digital & tanda terima | **belum ada jadwal servis otomatis** → Fase A |
| Purchasing | Ada (dasar: rekap kebutuhan + export) | **belum ada PO/Invoice/Pembayaran** → Fase B |
| PO & Invoice | Belum ada | → Fase B |
| Upah Kerja (termin) | Belum ada | → Fase C |
| Costing Engine (setelan default) | Setara via AHSP unit price + Pengaturan Proyek (PPN/overhead/TKDN per proyek) | opsional: default global, digabung Fase B |
| Surat Penawaran | **Sudah dibangun** (sesi sebelumnya) | — |
| Laporan (profit/margin lintas proyek) | Belum ada | → Fase D (perlu data dari Fase B & C) |
| Notifikasi WhatsApp | Belum ada | → Fase E (opsional, infra terpisah) |

---

## 3. FASE A — Jadwal Servis Peralatan

**Tujuan:** melengkapi menu Peralatan yang sudah ada dengan riwayat servis & pengingat, supaya
alat tidak dipakai lewat jadwal servis tanpa disadari.

**Perubahan DB**
- `equipment`: tambah `service_interval_months int` (mis. default 6, boleh kosong = tanpa jadwal rutin).
- Tabel baru `equipment_services`: `id, equipment_id (FK), service_date, service_type (rutin/perbaikan/kalibrasi), cost, vendor, notes, receipt_url, next_service_date, created_at`.

**Perubahan UI**
- Badge status di kartu/baris alat: Aman (hijau, >14 hari lagi) / Segera Servis (kuning, ≤14 hari) / Terlambat (merah + jumlah hari) / Belum Dijadwalkan (abu).
- Ringkasan di atas daftar: "2 alat terlambat servis · 3 alat segera servis".
- Filter "Perlu Servis" di halaman `/equipment`.
- Tombol "Catat Servis" per alat → dialog: tanggal, jenis, biaya, vendor, catatan → simpan ke riwayat, `next_service_date` **dihitung otomatis** (tanggal servis + interval).
- Saat klik "Pinjamkan" pada alat yang terlambat servis → peringatan (tidak memblokir): *"Alat ini terlambat servis N hari. Tetap dipinjam?"*

**Effort:** kecil, ±0.5 hari kerja setara. Tidak bergantung fase lain.

---

## 4. FASE B — Purchasing Lanjutan: PO, Invoice, Pembayaran

**Tujuan:** Purchasing tidak berhenti di "rekap kebutuhan", tapi lanjut sampai **PO ke supplier
→ catat invoice → bayar dengan bukti transfer**, termasuk retensi.

**Alur baru**
```
1. Purchasing (dari rekap live)     2. Admin                      3. Finance
   Pilih baris per supplier    →    Terima invoice supplier   →   Bayar + upload bukti
   → "Buat PO" (snapshot)           → catat no/nominal/file        → status Lunas
   Status PO: Dipesan                 Status: Invoiced
```

**Perubahan/tabel baru**
- `purchase_orders` (snapshot header per supplier per proyek): `id, project_id, owner_id, supplier_id, po_number (auto PO-0001), po_date, status (ordered/invoiced/paid/cancelled), invoice_number, invoice_amount, invoice_url, invoice_date, total_amount, retensi_pct, note, created_at`.
- `purchase_order_items` (snapshot baris, disalin dari hasil live take-off saat "Buat PO" ditekan — bukan tabel purchasing permanen): `id, po_id, material_name, qty, unit, unit_price, total`.
- `purchase_payments` (riwayat pembayaran, bisa 1 pembayaran mencakup beberapa PO/supplier sama): `id, owner_id, project_id, supplier_name, total_amount, proof_url, note, paid_at`.
- Storage bucket/upload bukti transfer & invoice (pakai pola upload gambar yang sama seperti tanda tangan peminjaman alat, disimpan sebagai data URL atau Supabase Storage — pilih salah satu saat eksekusi).

**Menu baru**
- **PO & Invoice** (`/projects/[id]/purchasing/po` atau menu tersendiri): pilih baris rekap purchasing per supplier → "Buat PO" (cetak PDF PO ke supplier) → tombol "Catat Invoice" (isi no. invoice, nominal, upload file).
- **Pembayaran** (`/purchasing/pembayaran`, lintas proyek): daftar PO berstatus *invoiced*, dikelompokkan per supplier → form bayar (checkbox PO, upload bukti transfer, tanggal & nominal) → set status *paid*.
- **Riwayat Pembayaran**: grouping per batch pembayaran, ringkasan Total Belanja vs Dibayar vs Sisa per proyek.
- Retensi (`retensi_pct`, umum 5% di kontrak konstruksi) dihitung di PO — nominal ditahan sampai serah terima, dicatat sebagai piutang retensi.

**Ketergantungan:** tidak ada (bisa mulai duluan, sudah tidak menyentuh baris purchasing live yang ada).

**Keputusan yang perlu dikonfirmasi:**
1. Kedalaman alur: **penuh** (PO → Invoice → Bayar, seperti di atas) atau **ringkas** (langsung tandai "siap bayar" dari rekap purchasing, tanpa dokumen PO formal)?
2. Upload bukti/invoice: simpan sebagai **base64 di DB** (konsisten dengan tanda tangan alat, tanpa setup storage bucket) atau pakai **Supabase Storage bucket** (lebih hemat DB, perlu setup bucket + policy)?

---

## 5. FASE C — Upah Kerja & SPK Manpower (Komitmen Borongan Tukang)

**Tujuan:** AI Manpower saat ini cuma **simulasi** (tidak mengikat). Konstruksi butuh dokumen
komitmen resmi ke mandor/tukang borongan — mirip SPK di RAB Estima, tapi klausul & role
disesuaikan proyek sipil (bukan furniture).

**Alur**
```
AI Manpower (simulasi tim & biaya)
   → [ Buat SPK dari Simulasi ]
SPK (editor: item pekerjaan, termin, klausul, sanksi, tanda tangan)
   → [ Setujui ] → termin aktif
Upah Kerja → Finance bayar tiap termin + bukti (pakai mekanisme sama dgn Fase B)
```

**Tabel baru**
- `manpower_spk` (header): `id, project_id, owner_id, manpower_plan_id (opsional, link ke simulasi AI), spk_number (auto), client_name, worker_name, worker_phone, spk_date, start_date, end_date, grand_total, status (draft/agreed/in_progress/done/cancelled), sanksi_text, note, approvals (jsonb)`.
- `manpower_spk_items`: `id, spk_id, description, qty, unit, price, total, sort`.
- `manpower_spk_clauses`: `id, spk_id, title, body, sort`.
- `spk_clause_templates` (library klausul standar, dipakai ulang): `id, owner_id, title, body, sort`.
- `labour_termins`: `id, spk_id (FK), description, amount, status (pending/paid), paid_at, note, sort`.

**Klausul default konstruksi** (beda dari RAB Estima yang berbasis furniture) — usulan 5 klausul awal:
retensi/jaminan pemeliharaan, denda keterlambatan per hari, K3 & keselamatan kerja, ketentuan
material disediakan pemberi kerja vs tukang, dan syarat serah-terima pekerjaan. Bisa diedit bebas.

**Termin**: DP / Progress 1 / Progress 2 / Pelunasan / Retensi (ditahan sampai masa
pemeliharaan selesai) — pola ini lazim di kontrak kerja konstruksi.

**Penyetuju (approval roles)** — disesuaikan struktur proyek sipil, bukan 6 role furniture
RAB Estima (Designer/SPV Sales dst). Usulan: **Pemilik Proyek/Owner, Project Manager/Pelaksana,
Pengawas/Konsultan Pengawas, Mandor/Tukang (pihak kedua)** — bisa disesuaikan lagi saat eksekusi.

**Tanda tangan digital**: reuse `SignaturePad` yang sudah dibuat untuk peminjaman alat — tidak
perlu komponen baru.

**Menu**
- Tab **SPK** di halaman `/projects/[id]/manpower` (gabung dengan Plan/Simulator/Realisasi yang sudah ada — pola sama seperti RAB Estima).
- Menu **Upah Kerja** (lintas proyek): daftar termin semua SPK, status bayar, tombol bayar (pakai mekanisme Pembayaran dari Fase B, gabung 1 modul Finance untuk material + upah).
- Export PDF SPK: kop, tabel item, tabel termin (kolom paraf), klausul bernomor, sanksi, blok tanda tangan multi-pihak.

**Ketergantungan:** pembayaran termin idealnya pakai modul Pembayaran yang sama dari Fase B —
lebih efisien kerjakan **Fase B dulu**, baru Fase C.

**Keputusan yang perlu dikonfirmasi:**
1. Role penyetuju final — pakai 4 usulan di atas atau ada peran lain yang lebih relevan ke alur kerja Anda?
2. Klausul default 5 poin di atas sudah cukup, atau ada klausul wajib khas proyek Anda (mis. acuan tender/kontrak pemerintah)?

---

## 6. FASE D — Laporan (Dashboard Finansial Lintas Proyek)

**Tujuan:** satu halaman yang menjawab "proyek mana untung, mana rugi" — versi sipil dari
laporan HPP/Profit RAB Estima.

**Konsep (disesuaikan)**
- RAB Estima: HPP vs Harga Jual (model dagang furniture per-unit).
- Estimator Sipil: **Nilai RAB/Kontrak** (dari Surat Penawaran yang diterima, atau Total RAB) vs
  **Realisasi Biaya** (Total dibayar material dari Fase B + Total dibayar upah dari Fase C) vs
  **Profit** vs **Margin** — plus TKDN% proyek (sudah ada datanya).

**Isi laporan**
- Ringkasan portofolio: Total Nilai Kontrak, Total Realisasi, Total Profit, Margin rata-rata.
- Tabel per proyek: status, nilai RAB, realisasi, profit, margin.
- Top material terpakai lintas proyek (dari histori purchasing).
- Export PDF & Excel (reuse skill `pdf`/`xlsx`, pola sama seperti export RAB/Purchasing yang sudah ada).

**Ketergantungan:** butuh data pembayaran aktual dari **Fase B & C** — kerjakan paling akhir
dari tiga fase inti (baru masuk akal setelah ada data realisasi biaya).

---

## 7. FASE E — Notifikasi WhatsApp (opsional, infra terpisah)

**Tujuan:** replikasi mekanisme notifikasi WA RAB Estima (Evolution API) untuk event penting:
invoice supplier masuk, termin siap dibayar, pembayaran berhasil, alat belum dikembalikan,
pengingat jadwal servis alat, follow-up Surat Penawaran yang belum direspons.

**Catatan penting:** ini butuh **instance WhatsApp terpisah** dari punya RAB Estima (jangan
pakai instance `INSTAND` yang sama, supaya notifikasi 2 aplikasi tidak tercampur) — bisa pakai
server Evolution API yang sama (`43.156.178.123:8080`) dengan nama instance baru, atau server
terpisah. Ini keputusan infrastruktur, bukan sekadar kode.

**Tabel** (pola sama seperti RAB Estima): `wa_settings`, `wa_event_settings` (per-event on/off +
grup tujuan), `wa_logs` (riwayat kirim), `wa_queue` (retry otomatis kalau gagal kirim).

**Status:** ditandai **opsional** — baru dikerjakan kalau Fase A–D sudah jalan dan Anda
konfirmasi mau pakai WA notif juga untuk aplikasi ini (perlu keputusan instance/nomor dulu).

---

## 8. Urutan Eksekusi yang Disarankan

```
Fase A (Servis Alat)  ──┐
                        ├─→ tidak saling bergantung, bisa duluan/paralel
Fase B (Purchasing PO/Invoice/Pembayaran) ─┐
                                           ├─→ Fase C butuh modul Pembayaran dari Fase B
Fase C (Upah Kerja / SPK)  ────────────────┘
                                           
Fase D (Laporan) ← butuh data realisasi dari Fase B & C, kerjakan setelahnya
Fase E (Notifikasi WA) ← opsional, terakhir, perlu keputusan infra dulu
```

Saran urutan konkret: **A → B → C → D**, lalu **E** kalau memang mau dipakai. Tiap fase
diverifikasi (`tsc`/`eslint`/`next build`) & di-commit terpisah, seperti pola kerja sesi-sesi
sebelumnya.

---

## 9. Keputusan yang Sudah Dikonfirmasi (29 Juli 2026)

1. **Fase B** — alur **penuh**: PO → Invoice → Bayar. Bukti transfer/invoice disimpan sebagai
   data URL (base64), konsisten dengan pola tanda tangan digital di Peminjaman Alat — tanpa
   setup Supabase Storage bucket baru.
2. **Fase C** — disamakan dengan RAB Estima: 6 role penyetuju tetap (Project Manager, Designer,
   Finance, Admin, Pengawas, SPV Sales) + Pemborong, tab "SPK" digabung ke halaman Manpower,
   5 klausul default (isi disesuaikan konteks konstruksi), tanda tangan digital reuse `SignaturePad`.
3. **Fase E** — **dikerjakan sekaligus** (bukan ditunda). Nama instance WhatsApp akan diisi user
   belakangan lewat halaman Notifikasi WA (field kosong dulu saat build, sama seperti pola
   ganti-instance di RAB Estima).
4. **Gudang — berubah arah, TETAP diperlukan.** Bukan gudang terpusat lintas proyek seperti RAB
   Estima, tapi **per-lokasi-proyek**: mayoritas material disimpan di **direksi keet** (kantor/gudang
   sementara di lokasi proyek). Ditambahkan sebagai **Fase B2** (lihat di bawah), diselipkan
   setelah Fase B karena berkaitan langsung dengan alur PO (barang datang → masuk stok gudang proyek).

---

## 10. FASE B2 — Gudang per-Proyek (Direksi Keet)

**Tujuan:** setiap proyek sipil punya lokasi penyimpanan sendiri di lapangan (direksi keet).
Material yang datang dicatat masuk, pemakaian dicatat keluar, sisa stok kelihatan — dan
Purchasing bisa memperhitungkan stok sisa sebelum membeli lagi. **Beda dari RAB Estima**: tidak
ada gudang terpusat lintas proyek — gudang **melekat ke satu proyek**.

**Tabel baru**
- `project_warehouses`: `id, project_id (FK), owner_id, name (default "Direksi Keet"), address, is_active, created_at`. Satu proyek bisa punya lebih dari satu lokasi (mis. direksi keet + gudang terbuka), tapi defaultnya 1 baris otomatis per proyek baru.
- `warehouse_stock`: `id, warehouse_id (FK), material_id (FK materials), qty, avg_cost, updated_at` — saldo stok berjalan per material per gudang.
- `warehouse_transactions`: `id, warehouse_id (FK), material_id (FK), type (masuk/keluar), qty, unit_price, reference (mis. no. PO), note, created_by, created_at`.

**Menu** (di bawah halaman proyek, sejajar Purchasing/Manpower)
- `/projects/[id]/warehouse` — tab **Stok** (saldo per material), **Barang Masuk** (form terima barang, opsional link ke PO dari Fase B), **Barang Keluar** (form pemakaian/keluar lapangan), **Atur Gudang** (nama/lokasi direksi keet).
- Saat PO (Fase B) berstatus terkirim/diterima → tombol "Catat Barang Masuk" langsung isi otomatis dari item PO.
- Rekap Purchasing (halaman yang sudah ada) menambahkan kolom **Stok Tersedia** & **Perlu Beli** = kebutuhan − stok gudang proyek — meniru ide RAB Estima tapi lingkupnya per-proyek, bukan lintas-proyek.

**Ketergantungan:** dikerjakan setelah **Fase B** (butuh struktur PO untuk tautan Barang Masuk),
sebelum Fase C/D.

---

## 11. Urutan Eksekusi Final

```
Fase A (Servis Alat)
   ↓
Fase B (Purchasing: PO → Invoice → Pembayaran)
   ↓
Fase B2 (Gudang per-Proyek / Direksi Keet) — terhubung ke PO Fase B
   ↓
Fase C (Upah Kerja & SPK Manpower) — pembayaran termin reuse modul Fase B
   ↓
Fase D (Laporan lintas proyek) — butuh data realisasi dari B/B2/C
   ↓
Fase E (Notifikasi WhatsApp) — dikerjakan sekaligus, instance diisi user belakangan
```

Tiap fase: migration → actions → UI → verifikasi (`tsc`/`eslint`/`next build`) → commit
terpisah, mengikuti pola kerja sesi-sesi sebelumnya. Tidak ada kode/DB RAB Estima yang disentuh
di proses ini.

-- ============================================================
-- Fase C: Formula/koefisien pada job_template_items, terhubung ke job_template_questions.key.
-- Volume item template kini bisa auto-hitung dari jawaban pertanyaan (pola sheet "Hitungan Volume":
-- rumus P x L x T, P x L, trapesium 1/2(a+b) x t, dst — dievaluasi lewat parser ekspresi aman di app,
-- BUKAN eval() SQL/JS). formula = null/kosong -> volume = coefficient (qty tetap).
-- ============================================================

alter table public.job_template_items
  add column if not exists formula text,
  add column if not exists coefficient numeric(12,4) not null default 1;

comment on column public.job_template_items.formula is
  'Ekspresi aritmatika (+ - * / ()) yang mereferensikan job_template_questions.key bertipe number milik template yang sama. Kosong = volume tetap sebesar coefficient.';
comment on column public.job_template_items.coefficient is
  'Pengali hasil formula (mis. 2 untuk plesteran 2 sisi), atau volume tetap jika formula kosong.';

-- ---------- lengkapi formula pada 3 template bawaan yang sudah ada (Fase 7.2) ----------

update public.job_template_items i set formula = 'panjang * lebar_bawah * tinggi', coefficient = 1.2
where i.name = 'Galian Tanah Pondasi'
  and i.template_id = (select id from public.job_templates where name = 'Pondasi Batu Kali' and owner_id is null);

update public.job_template_items i set formula = 'panjang * lebar_bawah', coefficient = 0.1
where i.name = 'Urugan Pasir Bawah Pondasi'
  and i.template_id = (select id from public.job_templates where name = 'Pondasi Batu Kali' and owner_id is null);

update public.job_template_items i set formula = '((lebar_atas + lebar_bawah) / 2) * tinggi * panjang', coefficient = 1
where i.name = 'Pasangan Batu Kali'
  and i.template_id = (select id from public.job_templates where name = 'Pondasi Batu Kali' and owner_id is null);

update public.job_template_items i set formula = 'panjang * lebar_bawah * tinggi', coefficient = 0.3
where i.name = 'Urugan Tanah Kembali'
  and i.template_id = (select id from public.job_templates where name = 'Pondasi Batu Kali' and owner_id is null);

update public.job_template_items i set formula = 'jumlah * tinggi * 0.15 * 0.15', coefficient = 1
where i.name = 'Beton Kolom Praktis'
  and i.template_id = (select id from public.job_templates where name = 'Kolom Praktis' and owner_id is null);

update public.job_template_items i set formula = 'jumlah * tinggi * 0.6', coefficient = 1
where i.name = 'Bekisting Kolom Praktis'
  and i.template_id = (select id from public.job_templates where name = 'Kolom Praktis' and owner_id is null);

update public.job_template_items i set formula = 'jumlah * tinggi', coefficient = 8
where i.name = 'Pembesian Kolom Praktis'
  and i.template_id = (select id from public.job_templates where name = 'Kolom Praktis' and owner_id is null);

update public.job_template_items i set formula = 'luas', coefficient = 1
where i.name = 'Pasangan Dinding Bata Merah'
  and i.template_id = (select id from public.job_templates where name = 'Dinding Bata Merah' and owner_id is null);

update public.job_template_items i set formula = 'luas', coefficient = 2
where i.name = 'Plesteran Dinding'
  and i.template_id = (select id from public.job_templates where name = 'Dinding Bata Merah' and owner_id is null);

update public.job_template_items i set formula = 'luas', coefficient = 2
where i.name = 'Acian Dinding'
  and i.template_id = (select id from public.job_templates where name = 'Dinding Bata Merah' and owner_id is null);

-- ---------- template baru: Rumah Tinggal Sederhana (dari contoh "Rab Rumah Sederhana.xlsx") ----------

insert into public.job_templates (id, owner_id, name, keywords, description) values
  ('00000000-0000-0000-0002-000000000001', null, 'Rumah Tinggal Sederhana',
   array['rumah tinggal', 'rumah sederhana', 'bangunan rumah'],
   'Template estimasi cepat rumah tinggal 1 lantai: jawab dimensi bangunan & pondasi, volume item utama terhitung otomatis (pola rumus P x L x T / P x L / trapesium dari sheet Hitungan Volume).')
on conflict (id) do nothing;

insert into public.job_template_questions (template_id, key, label, qtype, unit, sort_order) values
  ('00000000-0000-0000-0002-000000000001', 'panjang_bangunan', 'Panjang Bangunan', 'number', 'm', 10),
  ('00000000-0000-0000-0002-000000000001', 'lebar_bangunan', 'Lebar Bangunan', 'number', 'm', 20),
  ('00000000-0000-0000-0002-000000000001', 'tinggi_dinding', 'Tinggi Dinding', 'number', 'm', 30),
  ('00000000-0000-0000-0002-000000000001', 'keliling_pondasi', 'Total Panjang Pondasi (keliling + sekat dalam)', 'number', 'm', 40),
  ('00000000-0000-0000-0002-000000000001', 'lebar_atas_pondasi', 'Lebar Atas Pondasi Batu Kali', 'number', 'm', 50),
  ('00000000-0000-0000-0002-000000000001', 'lebar_bawah_pondasi', 'Lebar Bawah Pondasi Batu Kali', 'number', 'm', 60),
  ('00000000-0000-0000-0002-000000000001', 'tinggi_pondasi', 'Tinggi Pondasi Batu Kali', 'number', 'm', 70),
  ('00000000-0000-0000-0002-000000000001', 'jumlah_pintu', 'Jumlah Pintu', 'number', 'unit', 80),
  ('00000000-0000-0000-0002-000000000001', 'luas_pintu_rata', 'Luas Rata-rata 1 Pintu', 'number', 'm2', 90),
  ('00000000-0000-0000-0002-000000000001', 'jumlah_jendela', 'Jumlah Jendela', 'number', 'unit', 100),
  ('00000000-0000-0000-0002-000000000001', 'luas_jendela_rata', 'Luas Rata-rata 1 Jendela', 'number', 'm2', 110),
  ('00000000-0000-0000-0002-000000000001', 'luas_lantai', 'Luas Lantai', 'number', 'm2', 120),
  ('00000000-0000-0000-0002-000000000001', 'jumlah_kolom', 'Jumlah Kolom Praktis', 'number', 'unit', 130),
  ('00000000-0000-0000-0002-000000000001', 'tinggi_kolom', 'Tinggi Kolom Praktis', 'number', 'm', 140)
on conflict do nothing;

insert into public.job_template_items (template_id, name, unit, formula, coefficient, sort_order) values
  ('00000000-0000-0000-0002-000000000001', 'Galian Tanah Pondasi', 'm3',
   'keliling_pondasi * lebar_bawah_pondasi * tinggi_pondasi', 1.1, 10),
  ('00000000-0000-0000-0002-000000000001', 'Urug Pasir Bawah Pondasi', 'm3',
   'keliling_pondasi * lebar_bawah_pondasi', 0.1, 20),
  ('00000000-0000-0000-0002-000000000001', 'Pasangan Batu Kosong (Aanstamping)', 'm3',
   'keliling_pondasi * lebar_bawah_pondasi * tinggi_pondasi', 0.25, 30),
  ('00000000-0000-0000-0002-000000000001', 'Pasangan Pondasi Batu Belah', 'm3',
   '((lebar_atas_pondasi + lebar_bawah_pondasi) / 2) * tinggi_pondasi * keliling_pondasi', 1, 40),
  ('00000000-0000-0000-0002-000000000001', 'Urugan Tanah Kembali', 'm3',
   'keliling_pondasi * lebar_bawah_pondasi * tinggi_pondasi', 0.3, 50),
  ('00000000-0000-0000-0002-000000000001', 'Beton Kolom Praktis', 'm3',
   'jumlah_kolom * tinggi_kolom * 0.15 * 0.15', 1, 60),
  ('00000000-0000-0000-0002-000000000001', 'Bekisting Kolom Praktis', 'm2',
   'jumlah_kolom * tinggi_kolom * 0.6', 1, 70),
  ('00000000-0000-0000-0002-000000000001', 'Pembesian Kolom Praktis', 'kg',
   'jumlah_kolom * tinggi_kolom', 8, 80),
  ('00000000-0000-0000-0002-000000000001', 'Pasangan Dinding Bata Merah', 'm2',
   '(panjang_bangunan * 2 + lebar_bangunan * 2) * tinggi_dinding - (jumlah_pintu * luas_pintu_rata) - (jumlah_jendela * luas_jendela_rata)', 1, 90),
  ('00000000-0000-0000-0002-000000000001', 'Plesteran Dinding (2 sisi)', 'm2',
   '(panjang_bangunan * 2 + lebar_bangunan * 2) * tinggi_dinding - (jumlah_pintu * luas_pintu_rata) - (jumlah_jendela * luas_jendela_rata)', 2, 100),
  ('00000000-0000-0000-0002-000000000001', 'Acian Dinding (2 sisi)', 'm2',
   '(panjang_bangunan * 2 + lebar_bangunan * 2) * tinggi_dinding - (jumlah_pintu * luas_pintu_rata) - (jumlah_jendela * luas_jendela_rata)', 2, 110),
  ('00000000-0000-0000-0002-000000000001', 'Pengecatan Dinding (2 lapis)', 'm2',
   '(panjang_bangunan * 2 + lebar_bangunan * 2) * tinggi_dinding - (jumlah_pintu * luas_pintu_rata) - (jumlah_jendela * luas_jendela_rata)', 2, 120),
  ('00000000-0000-0000-0002-000000000001', 'Pasang Keramik Lantai', 'm2',
   'luas_lantai', 1, 130),
  ('00000000-0000-0000-0002-000000000001', 'Rangka & Penutup Atap', 'm2',
   'luas_lantai', 1.15, 140),
  ('00000000-0000-0000-0002-000000000001', 'Pekerjaan Persiapan (Bersih Lahan & Bowplank)', 'm2',
   'luas_lantai', 1, 150)
on conflict do nothing;

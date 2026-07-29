-- ============================================================
-- Fase D: Generalisasi Volume Calculator
-- Skema resep volume generik: tipe rumus (pxlxt/pxl/keliling/trapesium/custom),
-- dimensi variabel, jumlah, generate multi rab_items sekaligus dari satu input dimensi.
-- Contoh: resep "Pondasi Batu Kali" -> Galian Tanah + Urug Pasir + Pasangan Batu Kosong + Pasangan Batu Belah.
-- ============================================================

-- ---------- volume_recipes (resep, owner_id null = resep global bawaan) ----------
create table if not exists public.volume_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null,
  formula_type text not null check (formula_type in ('pxlxt', 'pxl', 'keliling', 'trapesium', 'custom')),
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists volume_recipes_owner_idx on public.volume_recipes (owner_id);

alter table public.volume_recipes enable row level security;

create policy "volume_recipes: read global + own" on public.volume_recipes
  for select using (owner_id is null or owner_id = auth.uid());
create policy "volume_recipes: insert own" on public.volume_recipes
  for insert with check (owner_id = auth.uid());
create policy "volume_recipes: update own" on public.volume_recipes
  for update using (owner_id = auth.uid());
create policy "volume_recipes: delete own" on public.volume_recipes
  for delete using (owner_id = auth.uid());

-- ---------- volume_recipe_items (rincian item RAB yang dihasilkan per resep) ----------
create table if not exists public.volume_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.volume_recipes (id) on delete cascade,
  name text not null,
  unit text not null,
  coefficient numeric(10,4) not null default 1,
  ahsp_item_id uuid references public.ahsp_items (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists volume_recipe_items_recipe_idx on public.volume_recipe_items (recipe_id);

alter table public.volume_recipe_items enable row level security;

create policy "volume_recipe_items: read via parent" on public.volume_recipe_items
  for select using (
    exists (
      select 1 from public.volume_recipes r
      where r.id = recipe_id and (r.owner_id is null or r.owner_id = auth.uid())
    )
  );
create policy "volume_recipe_items: write via parent owner" on public.volume_recipe_items
  for all using (
    exists (select 1 from public.volume_recipes r where r.id = recipe_id and r.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.volume_recipes r where r.id = recipe_id and r.owner_id = auth.uid())
  );

-- ---------- volume_generic_entries (hasil input dimensi per proyek, sebelum dikirim ke RAB) ----------
create table if not exists public.volume_generic_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  recipe_id uuid references public.volume_recipes (id) on delete set null,
  recipe_name text not null,
  formula_type text not null check (formula_type in ('pxlxt', 'pxl', 'keliling', 'trapesium', 'custom')),
  name text not null,
  section text,
  quantity numeric(10,2) not null default 1,
  panjang_m numeric(10,3) not null default 0,
  lebar_m numeric(10,3) not null default 0,
  lebar_atas_m numeric(10,3) not null default 0,
  lebar_bawah_m numeric(10,3) not null default 0,
  tinggi_m numeric(10,3) not null default 0,
  custom_volume numeric(14,4) not null default 0,
  base_volume numeric(14,4) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists volume_generic_entries_project_idx on public.volume_generic_entries (project_id);

alter table public.volume_generic_entries enable row level security;

create policy "volume_generic_entries: crud via project owner" on public.volume_generic_entries
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- ---------- seed: resep umum bawaan (global, owner_id null) ----------
insert into public.volume_recipes (id, name, formula_type, description, sort_order) values
  ('00000000-0000-0000-0001-000000000001', 'Pondasi Batu Kali (Trapesium)', 'trapesium',
   'Galian, urug pasir, aanstamping & pasangan batu kali dari penampang trapesium x panjang.', 10),
  ('00000000-0000-0000-0001-000000000002', 'Sloof Beton Praktis', 'pxlxt',
   'Cor sloof + bekisting dari penampang persegi x panjang.', 20),
  ('00000000-0000-0000-0001-000000000003', 'Dinding Bata / Hebel', 'pxl',
   'Pasangan dinding + plesteran & acian 2 sisi dari luas dinding (panjang x tinggi).', 30),
  ('00000000-0000-0000-0001-000000000004', 'Plesteran & Acian per m2', 'pxl',
   'Plesteran + acian langsung dari luas permukaan.', 40),
  ('00000000-0000-0000-0001-000000000005', 'Pengecatan Dinding', 'pxl',
   'Cat dasar + cat akhir dari luas permukaan (2 lapis).', 50),
  ('00000000-0000-0000-0001-000000000006', 'Keramik Lantai', 'pxl',
   'Pasang keramik lantai dari luas ruangan.', 60),
  ('00000000-0000-0000-0001-000000000007', 'Cor Rabat Beton', 'pxlxt',
   'Rabat beton tumbuk / lantai kerja dari luas x tebal.', 70),
  ('00000000-0000-0000-0001-000000000008', 'Galian & Urugan Tanah', 'pxlxt',
   'Galian tanah biasa + urugan kembali dari volume galian.', 80),
  ('00000000-0000-0000-0001-000000000009', 'List Plafon / Lisplang', 'keliling',
   'Pemasangan list dari total keliling ruangan/atap (panjang meter).', 90),
  ('00000000-0000-0000-0001-000000000010', 'Kolom Praktis', 'pxlxt',
   'Cor kolom praktis + bekisting dari penampang x tinggi.', 100)
on conflict (id) do nothing;

insert into public.volume_recipe_items (recipe_id, name, unit, coefficient, sort_order) values
  -- Pondasi Batu Kali (Trapesium): base_volume = luas trapesium x panjang (m3)
  ('00000000-0000-0000-0001-000000000001', 'Galian Tanah Pondasi', 'm3', 1.10, 10),
  ('00000000-0000-0000-0001-000000000001', 'Urug Pasir Bawah Pondasi', 'm3', 0.10, 20),
  ('00000000-0000-0000-0001-000000000001', 'Pasangan Batu Kosong (Aanstamping)', 'm3', 0.25, 30),
  ('00000000-0000-0000-0001-000000000001', 'Pasangan Batu Belah/Kali 1:4', 'm3', 1.00, 40),
  ('00000000-0000-0000-0001-000000000001', 'Urugan Tanah Kembali', 'm3', 0.30, 50),

  -- Sloof Beton Praktis: base_volume = lebar x tinggi x panjang (m3)
  ('00000000-0000-0000-0001-000000000002', 'Beton Sloof', 'm3', 1.00, 10),
  ('00000000-0000-0000-0001-000000000002', 'Bekisting Sloof', 'm2', 4.00, 20),
  ('00000000-0000-0000-0001-000000000002', 'Pembesian Sloof', 'kg', 110.00, 30),

  -- Dinding Bata / Hebel: base_volume = panjang x tinggi (m2)
  ('00000000-0000-0000-0001-000000000003', 'Pasangan Dinding Bata/Hebel', 'm2', 1.00, 10),
  ('00000000-0000-0000-0001-000000000003', 'Plesteran Dinding (2 sisi)', 'm2', 2.00, 20),
  ('00000000-0000-0000-0001-000000000003', 'Acian Dinding (2 sisi)', 'm2', 2.00, 30),

  -- Plesteran & Acian per m2: base_volume = luas (m2)
  ('00000000-0000-0000-0001-000000000004', 'Plesteran', 'm2', 1.00, 10),
  ('00000000-0000-0000-0001-000000000004', 'Acian', 'm2', 1.00, 20),

  -- Pengecatan Dinding: base_volume = luas (m2)
  ('00000000-0000-0000-0001-000000000005', 'Cat Dasar (Plamir)', 'm2', 1.00, 10),
  ('00000000-0000-0000-0001-000000000005', 'Cat Akhir (2 lapis)', 'm2', 1.00, 20),

  -- Keramik Lantai: base_volume = luas (m2)
  ('00000000-0000-0000-0001-000000000006', 'Pasang Keramik Lantai', 'm2', 1.00, 10),
  ('00000000-0000-0000-0001-000000000006', 'Urug Pasir Bawah Lantai', 'm3', 0.05, 20),

  -- Cor Rabat Beton: base_volume = luas x tebal (m3)
  ('00000000-0000-0000-0001-000000000007', 'Rabat Beton', 'm3', 1.00, 10),
  ('00000000-0000-0000-0001-000000000007', 'Urug Pasir Bawah Rabat', 'm3', 0.10, 20),

  -- Galian & Urugan Tanah: base_volume = panjang x lebar x tinggi (m3)
  ('00000000-0000-0000-0001-000000000008', 'Galian Tanah Biasa', 'm3', 1.00, 10),
  ('00000000-0000-0000-0001-000000000008', 'Urugan Tanah Kembali', 'm3', 0.30, 20),
  ('00000000-0000-0000-0001-000000000008', 'Buangan Tanah Sisa Galian', 'm3', 0.70, 30),

  -- List Plafon / Lisplang: base_volume = keliling (m1)
  ('00000000-0000-0000-0001-000000000009', 'Pasang List Plafon/Lisplang', 'm1', 1.00, 10),

  -- Kolom Praktis: base_volume = lebar x tinggi_penampang x panjang (m3) -- gunakan panjang sbg tinggi kolom
  ('00000000-0000-0000-0001-000000000010', 'Beton Kolom Praktis', 'm3', 1.00, 10),
  ('00000000-0000-0000-0001-000000000010', 'Bekisting Kolom Praktis', 'm2', 4.00, 20),
  ('00000000-0000-0000-0001-000000000010', 'Pembesian Kolom Praktis', 'kg', 90.00, 30)
on conflict do nothing;

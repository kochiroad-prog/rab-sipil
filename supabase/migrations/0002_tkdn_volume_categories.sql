-- ============================================================
-- Fase 2: TKDN, Backup Volume (generator beton & besi), kategori AHSP resmi
-- ============================================================

-- keamanan: pastikan fungsi trigger tidak bisa dipanggil publik lewat RPC
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ---------- TKDN: % komponen dalam negeri ----------
alter table public.ahsp_items
  add column if not exists tkdn_percent numeric(5,2) not null default 0;

alter table public.ahsp_components
  add column if not exists tkdn_percent numeric(5,2) not null default 0;

alter table public.rab_items
  add column if not exists tkdn_percent numeric(5,2) not null default 0;

comment on column public.rab_items.tkdn_percent is
  'Persentase TKDN item ini (0-100). Disalin dari ahsp_items saat dipilih dari referensi, atau diisi manual untuk item custom.';

-- ---------- kategori AHSP resmi (Bina Marga / Cipta Karya / SDA / Umum) ----------
insert into public.ahsp_categories (code, name, sort_order) values
  ('BM', 'Bina Marga', 10),
  ('CK', 'Cipta Karya', 20),
  ('SDA', 'Sumber Daya Air', 30),
  ('U', 'Umum', 40)
on conflict do nothing;

alter table public.ahsp_categories
  add column if not exists bidang text
    check (bidang in ('bina_marga', 'cipta_karya', 'sumber_daya_air', 'umum') or bidang is null);

update public.ahsp_categories set bidang = 'bina_marga' where code = 'BM';
update public.ahsp_categories set bidang = 'cipta_karya' where code = 'CK';
update public.ahsp_categories set bidang = 'sumber_daya_air' where code = 'SDA';
update public.ahsp_categories set bidang = 'umum' where code = 'U';

-- ---------- Backup Volume: generator beton & besi ----------
create table if not exists public.structural_elements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  element_type text not null check (element_type in ('kolom', 'balok', 'sloof', 'plat')),
  name text not null,
  section text,
  quantity int not null default 1,

  -- dimensi (meter)
  length_m numeric(10,3) not null default 0,
  width_m numeric(10,3) not null default 0,
  height_m numeric(10,3) not null default 0,
  thickness_m numeric(10,3) not null default 0,

  -- tulangan
  main_bar_dia_mm numeric(6,2) not null default 0,
  main_bar_count int not null default 0,
  main_bar_spacing_m numeric(6,3) not null default 0,
  stirrup_dia_mm numeric(6,2) not null default 0,
  stirrup_spacing_m numeric(6,3) not null default 0,

  concrete_class text,

  -- hasil hitung (disimpan agar konsisten dengan yang tampil di RAB)
  volume_beton_m3 numeric(12,4) not null default 0,
  volume_bekisting_m2 numeric(12,4) not null default 0,
  berat_besi_kg numeric(12,3) not null default 0,

  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists structural_elements_project_idx on public.structural_elements (project_id);

alter table public.structural_elements enable row level security;

create policy "structural_elements: crud via project owner" on public.structural_elements
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

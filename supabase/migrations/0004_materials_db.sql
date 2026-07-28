-- ============================================================
-- Fase 7.1: Material DB Sipil + link ke komposisi AHSP
-- ============================================================

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = referensi global
  category text not null default 'lainnya'
    check (category in ('semen','pasir','kerikil','besi','kayu','bata','keramik','cat','pipa','kabel','cat_finishing','lainnya')),
  kind text not null default 'bulk'
    check (kind in ('linear','sheet','coverage','count','bulk')),
  code text,
  name text not null,
  unit text not null,
  price numeric(16,2) not null default 0,
  waste_pct numeric(5,2) not null default 0,
  length_mm numeric(10,2),
  diameter_mm numeric(6,2),
  sheet_width_mm numeric(10,2),
  sheet_height_mm numeric(10,2),
  coverage_per_unit numeric(10,3),
  consumption_per_m2 numeric(10,3),
  aliases text[],
  brand text,
  specification text,
  tkdn_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists materials_owner_idx on public.materials (owner_id);
create index if not exists materials_category_idx on public.materials (category);

alter table public.materials enable row level security;

create policy "materials: read global + own" on public.materials
  for select using (owner_id is null or owner_id = auth.uid());
create policy "materials: insert own" on public.materials
  for insert with check (owner_id = auth.uid());
create policy "materials: update own" on public.materials
  for update using (owner_id = auth.uid());
create policy "materials: delete own" on public.materials
  for delete using (owner_id = auth.uid());

alter table public.ahsp_components
  add column if not exists material_id uuid references public.materials (id) on delete set null;

create index if not exists ahsp_components_material_idx on public.ahsp_components (material_id);

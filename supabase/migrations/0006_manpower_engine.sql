-- ============================================================
-- Fase 7.3: Manpower Engine Sipil (Labour DB + Work Activities + Manpower Plan)
-- ============================================================

create table if not exists public.labours (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  kategori text not null default 'lainnya'
    check (kategori in ('tukang_batu','tukang_besi','tukang_kayu','tukang_cat','mandor','operator_alat','helper','lainnya')),
  level text not null default 'regular' check (level in ('junior','regular','senior','expert')),
  name text not null,
  daily_rate numeric(16,2) not null default 0,
  borongan_multiplier numeric(6,3) not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.labours enable row level security;
create policy "labours: read global + own" on public.labours
  for select using (owner_id is null or owner_id = auth.uid());
create policy "labours: insert own" on public.labours
  for insert with check (owner_id = auth.uid());
create policy "labours: update own" on public.labours
  for update using (owner_id = auth.uid());
create policy "labours: delete own" on public.labours
  for delete using (owner_id = auth.uid());

create table if not exists public.work_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  kategori_pekerjaan text not null,
  activity_name text not null,
  skill_kategori text not null default 'lainnya'
    check (skill_kategori in ('tukang_batu','tukang_besi','tukang_kayu','tukang_cat','mandor','operator_alat','helper','lainnya')),
  unit text not null,
  productivity_rate numeric(12,3) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.work_activities enable row level security;
create policy "work_activities: read global + own" on public.work_activities
  for select using (owner_id is null or owner_id = auth.uid());
create policy "work_activities: insert own" on public.work_activities
  for insert with check (owner_id = auth.uid());
create policy "work_activities: update own" on public.work_activities
  for update using (owner_id = auth.uid());
create policy "work_activities: delete own" on public.work_activities
  for delete using (owner_id = auth.uid());

create table if not exists public.manpower_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  ai_result jsonb not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists manpower_plans_project_idx on public.manpower_plans (project_id);

alter table public.manpower_plans enable row level security;
create policy "manpower_plans: crud via project owner" on public.manpower_plans
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- seed contoh produktivitas standar (referensi umum, boleh disesuaikan)
insert into public.work_activities (kategori_pekerjaan, activity_name, skill_kategori, unit, productivity_rate) values
  ('Pekerjaan Tanah', 'Galian tanah biasa manual', 'helper', 'm3/hari', 1.5),
  ('Pekerjaan Pondasi', 'Pasangan batu kali', 'tukang_batu', 'm3/hari', 1.0),
  ('Pekerjaan Beton', 'Pengecoran beton manual', 'tukang_batu', 'm3/hari', 3.0),
  ('Pekerjaan Beton', 'Pembesian', 'tukang_besi', 'kg/hari', 80),
  ('Pekerjaan Beton', 'Bekisting', 'tukang_kayu', 'm2/hari', 6.0),
  ('Pekerjaan Dinding', 'Pasangan bata merah', 'tukang_batu', 'm2/hari', 8.0),
  ('Pekerjaan Dinding', 'Plesteran', 'tukang_batu', 'm2/hari', 10.0),
  ('Pekerjaan Finishing', 'Pengecatan', 'tukang_cat', 'm2/hari', 25.0)
on conflict do nothing;

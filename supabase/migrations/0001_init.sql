-- ============================================================
-- Estimator Sipil & Konstruksi - initial schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  company_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- ahsp_categories ----------
create table if not exists public.ahsp_categories (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ahsp_categories enable row level security;
create policy "ahsp_categories: read all" on public.ahsp_categories
  for select using (true);

-- ---------- ahsp_items (referensi harga satuan pekerjaan) ----------
-- owner_id null  = data referensi global (bisa dibaca semua user)
-- owner_id set   = item custom milik user tsb
create table if not exists public.ahsp_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  category_id uuid references public.ahsp_categories (id) on delete set null,
  code text,
  name text not null,
  unit text not null,
  unit_price numeric(16,2) not null default 0,
  source text default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ahsp_items_category_idx on public.ahsp_items (category_id);
create index if not exists ahsp_items_owner_idx on public.ahsp_items (owner_id);

alter table public.ahsp_items enable row level security;

create policy "ahsp_items: read global + own" on public.ahsp_items
  for select using (owner_id is null or owner_id = auth.uid());
create policy "ahsp_items: insert own" on public.ahsp_items
  for insert with check (owner_id = auth.uid());
create policy "ahsp_items: update own" on public.ahsp_items
  for update using (owner_id = auth.uid());
create policy "ahsp_items: delete own" on public.ahsp_items
  for delete using (owner_id = auth.uid());

-- ---------- ahsp_components (opsional: rincian bahan/upah/alat) ----------
create table if not exists public.ahsp_components (
  id uuid primary key default gen_random_uuid(),
  ahsp_item_id uuid not null references public.ahsp_items (id) on delete cascade,
  component_type text not null check (component_type in ('material', 'labor', 'equipment')),
  name text not null,
  unit text not null,
  coefficient numeric(16,4) not null default 0,
  unit_price numeric(16,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ahsp_components_item_idx on public.ahsp_components (ahsp_item_id);

alter table public.ahsp_components enable row level security;

create policy "ahsp_components: read via parent" on public.ahsp_components
  for select using (
    exists (
      select 1 from public.ahsp_items i
      where i.id = ahsp_item_id
        and (i.owner_id is null or i.owner_id = auth.uid())
    )
  );
create policy "ahsp_components: write via parent owner" on public.ahsp_components
  for all using (
    exists (
      select 1 from public.ahsp_items i
      where i.id = ahsp_item_id and i.owner_id = auth.uid()
    )
  );

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  client_name text,
  location text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'done', 'archived')),
  ppn_percent numeric(5,2) not null default 11,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id);

alter table public.projects enable row level security;

create policy "projects: crud own" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------- rab_items (baris RAB per proyek) ----------
create table if not exists public.rab_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  ahsp_item_id uuid references public.ahsp_items (id) on delete set null,
  section text,
  name text not null,
  unit text not null,
  volume numeric(16,3) not null default 0,
  unit_price numeric(16,2) not null default 0,
  sort_order int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rab_items_project_idx on public.rab_items (project_id);

alter table public.rab_items enable row level security;

create policy "rab_items: crud via project owner" on public.rab_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- ---------- seed: kategori & contoh AHSP (placeholder, sesuaikan dengan harga lokal terbaru) ----------
insert into public.ahsp_categories (code, name, sort_order) values
  ('A', 'Pekerjaan Persiapan', 1),
  ('B', 'Pekerjaan Tanah', 2),
  ('C', 'Pekerjaan Pondasi', 3),
  ('D', 'Pekerjaan Beton', 4),
  ('E', 'Pekerjaan Dinding & Plesteran', 5),
  ('F', 'Pekerjaan Atap', 6),
  ('G', 'Pekerjaan Finishing', 7)
on conflict do nothing;


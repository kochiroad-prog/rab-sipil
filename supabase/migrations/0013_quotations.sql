-- Profil perusahaan (kop surat)
create table if not exists public.company_profile (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  company_name text,
  address text,
  phone text,
  email text,
  updated_at timestamptz not null default now()
);
alter table public.company_profile enable row level security;
create policy "company_profile: crud own" on public.company_profile
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Surat Penawaran (Quotation)
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  quote_number text,
  quote_date date not null default current_date,
  valid_until date,
  client_name text,
  client_address text,
  client_contact text,
  greeting text,
  closing_notes text,
  discount_percent numeric not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quotations_project_idx on public.quotations (project_id);
create index if not exists quotations_owner_idx on public.quotations (owner_id);

alter table public.quotations enable row level security;
create policy "quotations: crud own" on public.quotations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

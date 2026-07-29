-- Peralatan & Peminjaman Alat
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  code text,
  category text not null default 'lainnya',
  name text not null,
  brand text,
  model text,
  serial_number text,
  condition text not null default 'baik',
  location text,
  purchase_date date,
  purchase_price numeric,
  next_service_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_owner_idx on public.equipment (owner_id);

alter table public.equipment enable row level security;
create policy "equipment: crud own" on public.equipment
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.equipment_loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  borrower_name text not null,
  borrower_role text,
  loan_date date not null default current_date,
  expected_return_date date,
  actual_return_date date,
  condition_out text,
  condition_in text,
  notes text,
  signature_data_url text,
  status text not null default 'dipinjam',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists equipment_loans_owner_idx on public.equipment_loans (owner_id);
create index if not exists equipment_loans_equipment_idx on public.equipment_loans (equipment_id);
create index if not exists equipment_loans_status_idx on public.equipment_loans (status);

alter table public.equipment_loans enable row level security;
create policy "equipment_loans: crud own" on public.equipment_loans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

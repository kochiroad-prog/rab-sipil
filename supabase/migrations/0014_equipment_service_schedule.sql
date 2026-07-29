alter table public.equipment
  add column if not exists service_interval_months int;

create table if not exists public.equipment_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  service_date date not null default current_date,
  service_type text not null default 'rutin',
  cost numeric not null default 0,
  vendor text,
  notes text,
  receipt_url text,
  next_service_date date,
  created_at timestamptz not null default now()
);
create index if not exists equipment_services_owner_idx on public.equipment_services (owner_id);
create index if not exists equipment_services_equipment_idx on public.equipment_services (equipment_id);

alter table public.equipment_services enable row level security;
create policy "equipment_services: crud own" on public.equipment_services
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

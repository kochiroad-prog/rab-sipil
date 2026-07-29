-- ============================================================
-- Menu Database Supplier
-- ============================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  city text,
  phone text,
  maps_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_owner_idx on public.suppliers (owner_id);

alter table public.suppliers enable row level security;

create policy "suppliers: crud own" on public.suppliers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.materials
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

create index if not exists materials_supplier_idx on public.materials (supplier_id);

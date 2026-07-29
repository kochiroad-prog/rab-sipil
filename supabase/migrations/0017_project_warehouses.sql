create table if not exists public.project_warehouses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null default 'Direksi Keet',
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists project_warehouses_project_idx on public.project_warehouses (project_id);

alter table public.project_warehouses enable row level security;
create policy "project_warehouses: crud own" on public.project_warehouses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.warehouse_stock (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.project_warehouses (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  qty numeric not null default 0,
  avg_cost numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (warehouse_id, material_id)
);

alter table public.warehouse_stock enable row level security;
create policy "warehouse_stock: via parent warehouse" on public.warehouse_stock
  for all using (
    exists (select 1 from public.project_warehouses w where w.id = warehouse_stock.warehouse_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.project_warehouses w where w.id = warehouse_stock.warehouse_id and w.owner_id = auth.uid())
  );

create table if not exists public.warehouse_transactions (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.project_warehouses (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  type text not null, -- masuk | keluar
  qty numeric not null default 0,
  unit_price numeric not null default 0,
  reference text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists warehouse_transactions_warehouse_idx on public.warehouse_transactions (warehouse_id);
create index if not exists warehouse_transactions_material_idx on public.warehouse_transactions (material_id);

alter table public.warehouse_transactions enable row level security;
create policy "warehouse_transactions: via parent warehouse" on public.warehouse_transactions
  for all using (
    exists (select 1 from public.project_warehouses w where w.id = warehouse_transactions.warehouse_id and w.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.project_warehouses w where w.id = warehouse_transactions.warehouse_id and w.owner_id = auth.uid())
  );

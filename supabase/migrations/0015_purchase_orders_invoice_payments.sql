create sequence if not exists purchase_order_seq;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  supplier_name text,
  po_number text default ('PO-' || lpad(nextval('purchase_order_seq')::text, 5, '0')),
  po_date date not null default current_date,
  status text not null default 'ordered', -- ordered | invoiced | paid | cancelled
  invoice_number text,
  invoice_amount numeric,
  invoice_url text,
  invoice_date date,
  total_amount numeric not null default 0,
  retensi_pct numeric not null default 0,
  payment_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchase_orders_owner_idx on public.purchase_orders (owner_id);
create index if not exists purchase_orders_project_idx on public.purchase_orders (project_id);
create index if not exists purchase_orders_status_idx on public.purchase_orders (status);

alter table public.purchase_orders enable row level security;
create policy "purchase_orders: crud own" on public.purchase_orders
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  material_name text not null,
  qty numeric not null default 0,
  unit text not null default '',
  unit_price numeric not null default 0,
  total numeric not null default 0,
  sort int not null default 0
);
create index if not exists purchase_order_items_po_idx on public.purchase_order_items (po_id);

alter table public.purchase_order_items enable row level security;
create policy "purchase_order_items: via parent po" on public.purchase_order_items
  for all using (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_items.po_id and po.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.purchase_orders po where po.id = purchase_order_items.po_id and po.owner_id = auth.uid())
  );

create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  supplier_name text,
  total_amount numeric not null default 0,
  proof_url text,
  note text,
  po_ids uuid[] not null default '{}',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists purchase_payments_owner_idx on public.purchase_payments (owner_id);

alter table public.purchase_payments enable row level security;
create policy "purchase_payments: crud own" on public.purchase_payments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

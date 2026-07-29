create sequence if not exists spk_seq;

create table if not exists public.manpower_spk (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  manpower_plan_id uuid references public.manpower_plans (id) on delete set null,
  spk_number text default ('SPK-' || lpad(nextval('spk_seq')::text, 4, '0')),
  client_name text,
  worker_name text,
  worker_phone text,
  spk_date date not null default current_date,
  start_date date,
  end_date date,
  grand_total numeric not null default 0,
  status text not null default 'draft', -- draft | agreed | in_progress | done | cancelled
  sanksi_text text,
  note text,
  approvals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manpower_spk_owner_idx on public.manpower_spk (owner_id);
create index if not exists manpower_spk_project_idx on public.manpower_spk (project_id);

alter table public.manpower_spk enable row level security;
create policy "manpower_spk: crud own" on public.manpower_spk
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.manpower_spk_items (
  id uuid primary key default gen_random_uuid(),
  spk_id uuid not null references public.manpower_spk (id) on delete cascade,
  description text,
  qty numeric not null default 1,
  unit text,
  price numeric not null default 0,
  total numeric not null default 0,
  sort int not null default 0
);
create index if not exists manpower_spk_items_spk_idx on public.manpower_spk_items (spk_id);

alter table public.manpower_spk_items enable row level security;
create policy "manpower_spk_items: via parent spk" on public.manpower_spk_items
  for all using (
    exists (select 1 from public.manpower_spk s where s.id = manpower_spk_items.spk_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.manpower_spk s where s.id = manpower_spk_items.spk_id and s.owner_id = auth.uid())
  );

create table if not exists public.manpower_spk_clauses (
  id uuid primary key default gen_random_uuid(),
  spk_id uuid not null references public.manpower_spk (id) on delete cascade,
  title text,
  body text,
  sort int not null default 0
);
create index if not exists manpower_spk_clauses_spk_idx on public.manpower_spk_clauses (spk_id);

alter table public.manpower_spk_clauses enable row level security;
create policy "manpower_spk_clauses: via parent spk" on public.manpower_spk_clauses
  for all using (
    exists (select 1 from public.manpower_spk s where s.id = manpower_spk_clauses.spk_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.manpower_spk s where s.id = manpower_spk_clauses.spk_id and s.owner_id = auth.uid())
  );

create table if not exists public.spk_clause_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text,
  body text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.spk_clause_templates enable row level security;
create policy "spk_clause_templates: crud own" on public.spk_clause_templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.labour_termins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  spk_id uuid references public.manpower_spk (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  worker_name text,
  description text,
  amount numeric not null default 0,
  status text not null default 'pending', -- pending | paid
  proof_url text,
  paid_at timestamptz,
  note text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists labour_termins_owner_idx on public.labour_termins (owner_id);
create index if not exists labour_termins_spk_idx on public.labour_termins (spk_id);

alter table public.labour_termins enable row level security;
create policy "labour_termins: crud own" on public.labour_termins
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

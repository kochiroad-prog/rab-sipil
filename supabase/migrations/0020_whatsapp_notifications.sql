create table if not exists public.wa_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  api_url text,
  api_key text,
  instance text,
  api_version text not null default 'auto',
  target_number text,
  updated_at timestamptz not null default now()
);
alter table public.wa_settings enable row level security;
create policy "wa_settings: crud own" on public.wa_settings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.wa_event_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_key text not null,
  enabled boolean not null default true,
  target_number text,
  unique (owner_id, event_key)
);
alter table public.wa_event_settings enable row level security;
create policy "wa_event_settings: crud own" on public.wa_event_settings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.wa_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_key text not null,
  target text,
  message text,
  status text not null default 'sent',
  response text,
  created_at timestamptz not null default now()
);
create index if not exists wa_logs_owner_idx on public.wa_logs (owner_id);
alter table public.wa_logs enable row level security;
create policy "wa_logs: crud own" on public.wa_logs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.wa_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_key text not null,
  target text,
  text text,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists wa_queue_owner_idx on public.wa_queue (owner_id);
create index if not exists wa_queue_status_idx on public.wa_queue (status);
alter table public.wa_queue enable row level security;
create policy "wa_queue: crud own" on public.wa_queue
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Fase F3: riwayat AI Estimator (foto + hasil deteksi tersimpan permanen), mengikuti pola
-- ai_estimations di RAB Estima (referensi read-only).

create table if not exists public.ai_estimations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  image_urls text[] not null default '{}',
  job_name text,
  hints text,
  template_id uuid references public.job_templates (id) on delete set null,
  template_name text,
  confidence text,
  notes text,
  questions jsonb not null default '[]',
  answers jsonb not null default '{}',
  status text not null default 'draft', -- draft | questions | saved
  model text,
  items_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_estimations_owner_idx on public.ai_estimations (owner_id);
create index if not exists ai_estimations_project_idx on public.ai_estimations (project_id);

alter table public.ai_estimations enable row level security;
create policy "ai_estimations: crud own" on public.ai_estimations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

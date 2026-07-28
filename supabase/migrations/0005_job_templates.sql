-- ============================================================
-- Fase 7.2: Template Pekerjaan (Knowledge DB) untuk AI Estimator Sipil
-- ============================================================

create table if not exists public.job_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade, -- null = referensi bersama
  name text not null,
  keywords text[] not null default '{}',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_templates enable row level security;

create policy "job_templates: read global + own" on public.job_templates
  for select using (owner_id is null or owner_id = auth.uid());
create policy "job_templates: insert own" on public.job_templates
  for insert with check (owner_id = auth.uid());
create policy "job_templates: update own" on public.job_templates
  for update using (owner_id = auth.uid());
create policy "job_templates: delete own" on public.job_templates
  for delete using (owner_id = auth.uid());

create table if not exists public.job_template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.job_templates (id) on delete cascade,
  key text not null,
  label text not null,
  qtype text not null default 'single' check (qtype in ('single', 'multi', 'number')),
  options text[] not null default '{}',
  unit text,
  allow_custom boolean not null default true,
  sort_order int not null default 0
);

create index if not exists job_template_questions_template_idx on public.job_template_questions (template_id);

alter table public.job_template_questions enable row level security;
create policy "job_template_questions: read via parent" on public.job_template_questions
  for select using (
    exists (select 1 from public.job_templates t where t.id = template_id and (t.owner_id is null or t.owner_id = auth.uid()))
  );
create policy "job_template_questions: write via parent owner" on public.job_template_questions
  for all using (
    exists (select 1 from public.job_templates t where t.id = template_id and t.owner_id = auth.uid())
  );

create table if not exists public.job_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.job_templates (id) on delete cascade,
  ahsp_item_id uuid references public.ahsp_items (id) on delete set null,
  name text not null,
  unit text not null,
  sort_order int not null default 0
);

create index if not exists job_template_items_template_idx on public.job_template_items (template_id);

alter table public.job_template_items enable row level security;
create policy "job_template_items: read via parent" on public.job_template_items
  for select using (
    exists (select 1 from public.job_templates t where t.id = template_id and (t.owner_id is null or t.owner_id = auth.uid()))
  );
create policy "job_template_items: write via parent owner" on public.job_template_items
  for all using (
    exists (select 1 from public.job_templates t where t.id = template_id and t.owner_id = auth.uid())
  );

-- seed: beberapa template pekerjaan umum (referensi bersama, owner_id null)
insert into public.job_templates (name, keywords, description) values
  ('Pondasi Batu Kali', array['pondasi batu kali','pondasi batu belah','pondasi menerus'], 'Pondasi menerus pasangan batu kali/belah untuk rumah/bangunan sederhana'),
  ('Kolom Praktis', array['kolom praktis','kolom beton'], 'Kolom struktur/praktis beton bertulang'),
  ('Dinding Bata Merah', array['dinding bata','pasangan bata merah','tembok bata'], 'Pasangan dinding bata merah + plesteran + acian')
on conflict do nothing;

-- seed pertanyaan & item per template dikerjakan lewat migration terpisah (butuh id hasil insert di atas);
-- lihat 0005b_job_template_seed.sql kalau ingin reproduksi manual di project lain.

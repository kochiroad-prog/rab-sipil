alter table public.projects
  add column if not exists overhead_percent numeric(5,2) not null default 10;

alter table public.projects
  add column if not exists tahun_anggaran int;

alter table public.purchase_orders add column if not exists received boolean not null default false;

alter table public.purchase_order_items
  add column if not exists material_id uuid references public.materials (id) on delete set null;

-- Fase F1: Fondasi upload foto — bucket Storage publik + policy.
-- Pola disamakan dengan RAB Estima (referensi read-only): publik bisa SELECT (baca),
-- hanya user login (authenticated) yang bisa INSERT/DELETE. Solo-user app, jadi tidak perlu
-- scoping owner_id per path (sama seperti RAB Estima).

insert into storage.buckets (id, name, public)
values
  ('project-photos', 'project-photos', true),
  ('material-images', 'material-images', true),
  ('equipment-images', 'equipment-images', true),
  ('labour-photos', 'labour-photos', true),
  ('payment-proofs', 'payment-proofs', true),
  ('signatures', 'signatures', true),
  ('invoices', 'invoices', true)
on conflict (id) do nothing;

do $$
declare
  b text;
  buckets text[] := array['project-photos','material-images','equipment-images','labour-photos','payment-proofs','signatures','invoices'];
begin
  foreach b in array buckets loop
    execute format(
      'create policy %I on storage.objects for select using (bucket_id = %L)',
      b || '_select', b
    );
    execute format(
      'create policy %I on storage.objects for insert with check (bucket_id = %L and auth.role() = %L)',
      b || '_insert', b, 'authenticated'
    );
    execute format(
      'create policy %I on storage.objects for delete using (bucket_id = %L and auth.role() = %L)',
      b || '_delete', b, 'authenticated'
    );
  end loop;
end $$;

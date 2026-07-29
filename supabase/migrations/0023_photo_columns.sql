-- Fase F4: kolom foto untuk Database referensi (Material/Peralatan/Tenaga Kerja),
-- menyamakan dengan RAB Estima (materials.image_url, equipment.image_url,
-- labours.photo_url + labours.ktp_url).

alter table public.materials add column if not exists image_url text;
alter table public.equipment add column if not exists image_url text;
alter table public.labours add column if not exists photo_url text;
alter table public.labours add column if not exists ktp_url text;

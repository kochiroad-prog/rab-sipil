-- ============================================================
-- Lengkapi Material DB: katalog material konstruksi standar (referensi global, owner_id null).
-- Harga estimasi pasaran umum sebagai titik awal — sesuaikan ke harga lokal terkini.
-- kind menentukan cara konversi Purchasing (lihat src/lib/takeoff-sipil.ts):
--   linear = per batang (length_mm), sheet = per lembar (sheet_width/height_mm),
--   coverage = per unit dengan daya sebar m2 (coverage_per_unit), count/bulk = satuan langsung.
-- ============================================================

insert into public.materials (category, kind, code, name, unit, price, waste_pct, length_mm, diameter_mm, sheet_width_mm, sheet_height_mm, coverage_per_unit, specification) values
  -- ---------- SEMEN ----------
  ('semen', 'bulk', 'SMN-001', 'Semen Portland (PC) 40kg', 'zak', 68000, 5, null, null, null, null, null, 'PC/OPC 40kg'),
  ('semen', 'bulk', 'SMN-002', 'Semen PCC 40kg', 'zak', 65000, 5, null, null, null, null, null, 'Portland Composite Cement'),
  ('semen', 'bulk', 'SMN-003', 'Semen Instan/Mortar 40kg', 'zak', 75000, 5, null, null, null, null, null, null),

  -- ---------- PASIR ----------
  ('pasir', 'bulk', 'PSR-001', 'Pasir Pasang', 'm3', 250000, 10, null, null, null, null, null, null),
  ('pasir', 'bulk', 'PSR-002', 'Pasir Beton/Cor', 'm3', 280000, 10, null, null, null, null, null, null),
  ('pasir', 'bulk', 'PSR-003', 'Pasir Urug', 'm3', 180000, 5, null, null, null, null, null, null),

  -- ---------- KERIKIL / AGREGAT ----------
  ('kerikil', 'bulk', 'KRK-001', 'Kerikil/Split 1-2 cm', 'm3', 320000, 5, null, null, null, null, null, null),
  ('kerikil', 'bulk', 'KRK-002', 'Kerikil/Split 2-3 cm', 'm3', 310000, 5, null, null, null, null, null, null),
  ('kerikil', 'bulk', 'KRK-003', 'Batu Kali/Belah', 'm3', 280000, 5, null, null, null, null, null, null),
  ('kerikil', 'bulk', 'KRK-004', 'Batu Pecah Base A (Sirtu)', 'm3', 300000, 5, null, null, null, null, null, null),

  -- ---------- BESI ----------
  ('besi', 'linear', 'BSI-006', 'Besi Beton Polos 6mm', 'btg', 35000, 5, 12000, 6, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-008', 'Besi Beton Polos 8mm', 'btg', 55000, 5, 12000, 8, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-010', 'Besi Beton Ulir 10mm', 'btg', 75000, 5, 12000, 10, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-012', 'Besi Beton Ulir 12mm', 'btg', 108000, 5, 12000, 12, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-013', 'Besi Beton Ulir 13mm', 'btg', 125000, 5, 12000, 13, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-016', 'Besi Beton Ulir 16mm', 'btg', 195000, 5, 12000, 16, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-019', 'Besi Beton Ulir 19mm', 'btg', 275000, 5, 12000, 19, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-022', 'Besi Beton Ulir 22mm', 'btg', 365000, 5, 12000, 22, null, null, null, 'panjang 12m'),
  ('besi', 'linear', 'BSI-025', 'Besi Beton Ulir 25mm', 'btg', 470000, 5, 12000, 25, null, null, null, 'panjang 12m'),
  ('besi', 'bulk', 'BSI-901', 'Kawat Bendrat', 'kg', 22000, 5, null, null, null, null, null, null),
  ('besi', 'sheet', 'BSI-902', 'Wiremesh M6', 'lembar', 650000, 5, null, null, 2100, 5400, null, 'M6 - 2.1m x 5.4m'),

  -- ---------- KAYU ----------
  ('kayu', 'linear', 'KYU-001', 'Kaso 5/7 Meranti', 'btg', 45000, 10, 4000, null, null, null, null, 'panjang 4m'),
  ('kayu', 'linear', 'KYU-002', 'Balok Kayu 6/12 Kamper', 'btg', 180000, 10, 4000, null, null, null, null, 'panjang 4m'),
  ('kayu', 'linear', 'KYU-003', 'Papan Kayu 2/20', 'btg', 65000, 10, 4000, null, null, null, null, 'panjang 4m'),
  ('kayu', 'linear', 'KYU-004', 'Kayu Dolken/Perancah', 'btg', 25000, 10, 4000, null, null, null, null, 'panjang 4m, diameter 8-10cm'),
  ('kayu', 'linear', 'KYU-005', 'Kaso Baja Ringan C75', 'btg', 65000, 5, 6000, null, null, null, null, 'panjang 6m'),
  ('kayu', 'sheet', 'KYU-101', 'Multiplek 9mm', 'lembar', 145000, 10, null, null, 1220, 2440, null, null),
  ('kayu', 'sheet', 'KYU-102', 'Multiplek 12mm', 'lembar', 175000, 10, null, null, 1220, 2440, null, null),
  ('kayu', 'sheet', 'KYU-103', 'Multiplek 18mm', 'lembar', 245000, 10, null, null, 1220, 2440, null, null),
  ('kayu', 'sheet', 'KYU-104', 'Triplek/Plywood 4mm', 'lembar', 75000, 10, null, null, 1220, 2440, null, null),

  -- ---------- BATA ----------
  ('bata', 'count', 'BTA-001', 'Bata Merah', 'buah', 800, 5, null, null, null, null, null, '5x11x22 cm'),
  ('bata', 'count', 'BTA-002', 'Batako', 'buah', 3500, 5, null, null, null, null, null, '10x20x40 cm'),
  ('bata', 'count', 'BTA-003', 'Bata Ringan/Hebel 7.5cm', 'buah', 7000, 5, null, null, null, null, null, '7.5x20x60 cm'),
  ('bata', 'count', 'BTA-004', 'Bata Ringan/Hebel 10cm', 'buah', 9000, 5, null, null, null, null, null, '10x20x60 cm'),

  -- ---------- KERAMIK ----------
  ('keramik', 'coverage', 'KRM-001', 'Keramik Lantai 40x40', 'dus', 85000, 8, null, null, null, null, 1.44, '9 pcs/dus'),
  ('keramik', 'coverage', 'KRM-002', 'Keramik Lantai 60x60', 'dus', 145000, 8, null, null, null, null, 1.44, '4 pcs/dus'),
  ('keramik', 'coverage', 'KRM-003', 'Keramik Dinding 25x40', 'dus', 75000, 8, null, null, null, null, 1.50, null),
  ('keramik', 'coverage', 'KRM-004', 'Granit 60x60', 'dus', 225000, 8, null, null, null, null, 1.44, null),
  ('keramik', 'linear', 'KRM-101', 'Plin Keramik', 'btg', 12000, 5, 600, null, null, null, null, 'panjang 60cm'),

  -- ---------- CAT ----------
  ('cat', 'coverage', 'CAT-001', 'Cat Tembok Interior 25kg', 'pail', 650000, 5, null, null, null, null, 100, '1 lapis, ~4m2/kg'),
  ('cat', 'coverage', 'CAT-002', 'Cat Tembok Exterior 25kg', 'pail', 750000, 5, null, null, null, null, 90, '1 lapis'),
  ('cat_finishing', 'coverage', 'CAT-003', 'Cat Dasar/Plamir 25kg', 'pail', 380000, 5, null, null, null, null, 120, null),
  ('cat_finishing', 'coverage', 'CAT-004', 'Cat Besi/Kayu 1kg', 'kg', 45000, 5, null, null, null, null, 8, null),
  ('cat_finishing', 'coverage', 'CAT-005', 'Meni Besi 1kg', 'kg', 38000, 5, null, null, null, null, 10, null),
  ('cat_finishing', 'bulk', 'CAT-006', 'Thinner', 'liter', 25000, 5, null, null, null, null, null, null),

  -- ---------- PIPA ----------
  ('pipa', 'linear', 'PIP-001', 'Pipa PVC 1/2" (AW)', 'btg', 18000, 5, 4000, null, null, null, null, 'panjang 4m'),
  ('pipa', 'linear', 'PIP-002', 'Pipa PVC 3/4" (AW)', 'btg', 25000, 5, 4000, null, null, null, null, 'panjang 4m'),
  ('pipa', 'linear', 'PIP-003', 'Pipa PVC 1" (AW)', 'btg', 35000, 5, 4000, null, null, null, null, 'panjang 4m'),
  ('pipa', 'linear', 'PIP-004', 'Pipa PVC 2" (AW)', 'btg', 65000, 5, 4000, null, null, null, null, 'panjang 4m'),
  ('pipa', 'linear', 'PIP-005', 'Pipa PVC 3" (AW)', 'btg', 110000, 5, 4000, null, null, null, null, 'panjang 4m'),
  ('pipa', 'linear', 'PIP-006', 'Pipa PVC 4" (AW)', 'btg', 165000, 5, 4000, null, null, null, null, 'panjang 4m'),
  ('pipa', 'linear', 'PIP-007', 'Pipa PPR 1/2"', 'btg', 22000, 5, 4000, null, null, null, null, 'panjang 4m'),

  -- ---------- KABEL ----------
  ('kabel', 'bulk', 'KBL-001', 'Kabel NYM 2x1.5mm', 'm', 8500, 5, null, null, null, null, null, null),
  ('kabel', 'bulk', 'KBL-002', 'Kabel NYM 3x2.5mm', 'm', 15000, 5, null, null, null, null, null, null),
  ('kabel', 'bulk', 'KBL-003', 'Kabel NYA 1.5mm', 'm', 4500, 5, null, null, null, null, null, null),
  ('kabel', 'bulk', 'KBL-004', 'Kabel NYA 2.5mm', 'm', 6500, 5, null, null, null, null, null, null),
  ('kabel', 'bulk', 'KBL-005', 'Kabel NYAF Grounding', 'm', 7000, 5, null, null, null, null, null, null),

  -- ---------- LAINNYA ----------
  ('lainnya', 'bulk', 'LNY-001', 'Paku 5-10cm', 'kg', 22000, 5, null, null, null, null, null, null),
  ('lainnya', 'bulk', 'LNY-002', 'Baut & Mur', 'kg', 28000, 5, null, null, null, null, null, null),
  ('lainnya', 'bulk', 'LNY-003', 'Lem Kayu', 'kg', 35000, 5, null, null, null, null, null, null),
  ('lainnya', 'count', 'LNY-004', 'Sealant/Silicone', 'tube', 45000, 5, null, null, null, null, null, null),
  ('lainnya', 'coverage', 'LNY-005', 'Waterproofing Coating', 'kg', 65000, 5, null, null, null, null, 1.5, null),
  ('lainnya', 'bulk', 'LNY-006', 'Plastik Cor/Terpal', 'm2', 8000, 5, null, null, null, null, null, null),
  ('lainnya', 'count', 'LNY-007', 'Benang Bangunan', 'roll', 15000, 0, null, null, null, null, null, null)
on conflict do nothing;

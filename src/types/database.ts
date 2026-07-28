export type AhspCategory = {
  id: string
  code: string | null
  name: string
  sort_order: number
  bidang: 'bina_marga' | 'cipta_karya' | 'sumber_daya_air' | 'umum' | null
  created_at: string
}

export type AhspItem = {
  id: string
  owner_id: string | null
  category_id: string | null
  code: string | null
  name: string
  unit: string
  unit_price: number
  tkdn_percent: number
  source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  owner_id: string
  name: string
  client_name: string | null
  location: string | null
  description: string | null
  status: 'draft' | 'active' | 'done' | 'archived'
  ppn_percent: number
  overhead_percent: number
  tahun_anggaran: number | null
  created_at: string
  updated_at: string
}

export type RabItem = {
  id: string
  project_id: string
  ahsp_item_id: string | null
  section: string | null
  name: string
  unit: string
  volume: number
  unit_price: number
  tkdn_percent: number
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type ElementType = 'kolom' | 'balok' | 'sloof' | 'plat'

export type StructuralElement = {
  id: string
  project_id: string
  element_type: ElementType
  name: string
  section: string | null
  quantity: number
  length_m: number
  width_m: number
  height_m: number
  thickness_m: number
  main_bar_dia_mm: number
  main_bar_count: number
  main_bar_spacing_m: number
  stirrup_dia_mm: number
  stirrup_spacing_m: number
  concrete_class: string | null
  volume_beton_m3: number
  volume_bekisting_m2: number
  berat_besi_kg: number
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

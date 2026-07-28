export type AhspCategory = {
  id: string
  code: string | null
  name: string
  sort_order: number
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
  sort_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

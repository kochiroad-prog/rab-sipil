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

export type MaterialCategory =
  | 'semen' | 'pasir' | 'kerikil' | 'besi' | 'baja' | 'kayu' | 'bata' | 'beton' | 'keramik'
  | 'cat' | 'pipa' | 'kabel' | 'elektrikal' | 'mep_utilitas' | 'sanitair' | 'atap'
  | 'rangka_atap' | 'talang' | 'insulasi' | 'waterproofing' | 'plafon' | 'pintu_jendela'
  | 'kaca_aluminium' | 'ornamen' | 'lansekap' | 'jalan' | 'tanah' | 'geotekstil'
  | 'alat_bantu' | 'lainnya'
export type MaterialKind = 'linear' | 'sheet' | 'coverage' | 'count' | 'bulk'

export type Material = {
  id: string
  owner_id: string | null
  category: MaterialCategory
  kind: MaterialKind
  code: string | null
  name: string
  unit: string
  price: number
  waste_pct: number
  length_mm: number | null
  diameter_mm: number | null
  sheet_width_mm: number | null
  sheet_height_mm: number | null
  coverage_per_unit: number | null
  consumption_per_m2: number | null
  aliases: string[] | null
  brand: string | null
  specification: string | null
  tkdn_percent: number
  supplier_id: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type Supplier = {
  id: string
  owner_id: string
  name: string
  city: string | null
  phone: string | null
  maps_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ComponentType = 'material' | 'labor' | 'equipment'

export type AhspComponent = {
  id: string
  ahsp_item_id: string
  material_id: string | null
  component_type: ComponentType
  name: string
  unit: string
  coefficient: number
  unit_price: number
  tkdn_percent: number
  created_at: string
}

export type JobTemplate = {
  id: string
  owner_id: string | null
  name: string
  keywords: string[]
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type QuestionType = 'single' | 'multi' | 'number'

export type JobTemplateQuestion = {
  id: string
  template_id: string
  key: string
  label: string
  qtype: QuestionType
  options: string[]
  unit: string | null
  allow_custom: boolean
  sort_order: number
}

export type JobTemplateItem = {
  id: string
  template_id: string
  ahsp_item_id: string | null
  name: string
  unit: string
  formula: string | null
  coefficient: number
  sort_order: number
}

export type SkillKategori =
  | 'tukang_batu' | 'tukang_besi' | 'tukang_kayu' | 'tukang_cat' | 'mandor' | 'operator_alat' | 'helper' | 'lainnya'

export type Labour = {
  id: string
  owner_id: string | null
  kategori: SkillKategori
  level: 'junior' | 'regular' | 'senior' | 'expert'
  name: string
  daily_rate: number
  borongan_multiplier: number
  notes: string | null
  photo_url: string | null
  ktp_url: string | null
  created_at: string
  updated_at: string
}

export type WorkActivity = {
  id: string
  owner_id: string | null
  kategori_pekerjaan: string
  activity_name: string
  skill_kategori: SkillKategori
  unit: string
  productivity_rate: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type ManpowerTeamPlanRow = {
  skill: string
  count: number
  days: number
  daily_rate: number
  total_cost: number
}

export type ManpowerWorkItemRow = {
  rab_item_name: string
  activity: string
  skill: string
  volume: number
  unit: string
  productivity_rate: number
  estimated_days: number
}

export type ManpowerAIResult = {
  work_items: ManpowerWorkItemRow[]
  team_plan: ManpowerTeamPlanRow[]
  borongan_comparison: {
    harian_total: number
    borongan_estimate_total: number
    recommendation: 'harian' | 'borongan' | string
    reasoning: string
  }
  summary_days: number
  summary_cost: number
}

export type ManpowerPlan = {
  id: string
  project_id: string
  ai_result: ManpowerAIResult
  model: string | null
  created_at: string
}

export type FormulaType = 'pxlxt' | 'pxl' | 'keliling' | 'trapesium' | 'custom'

export type VolumeRecipe = {
  id: string
  owner_id: string | null
  name: string
  formula_type: FormulaType
  description: string | null
  sort_order: number
  created_at: string
}

export type VolumeRecipeItem = {
  id: string
  recipe_id: string
  name: string
  unit: string
  coefficient: number
  ahsp_item_id: string | null
  sort_order: number
  created_at: string
}

export type VolumeGenericEntry = {
  id: string
  project_id: string
  recipe_id: string | null
  recipe_name: string
  formula_type: FormulaType
  name: string
  section: string | null
  quantity: number
  panjang_m: number
  lebar_m: number
  lebar_atas_m: number
  lebar_bawah_m: number
  tinggi_m: number
  custom_volume: number
  base_volume: number
  sort_order: number
  created_at: string
}

export type EquipmentCategory =
  | 'alat_berat' | 'alat_tangan' | 'alat_ukur' | 'scaffolding' | 'genset' | 'alat_listrik' | 'lainnya'
export type EquipmentCondition = 'baik' | 'rusak_ringan' | 'rusak_berat' | 'perbaikan'

export type Equipment = {
  id: string
  owner_id: string
  code: string | null
  category: EquipmentCategory
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  condition: EquipmentCondition
  location: string | null
  purchase_date: string | null
  purchase_price: number | null
  next_service_date: string | null
  service_interval_months: number | null
  notes: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type EquipmentServiceType = 'rutin' | 'perbaikan' | 'kalibrasi'

export type EquipmentService = {
  id: string
  owner_id: string
  equipment_id: string
  service_date: string
  service_type: EquipmentServiceType
  cost: number
  vendor: string | null
  notes: string | null
  receipt_url: string | null
  next_service_date: string | null
  created_at: string
}

export type LoanStatus = 'dipinjam' | 'dikembalikan' | 'hilang' | 'rusak'

export type EquipmentLoan = {
  id: string
  owner_id: string
  equipment_id: string
  project_id: string | null
  borrower_name: string
  borrower_role: string | null
  loan_date: string
  expected_return_date: string | null
  actual_return_date: string | null
  condition_out: string | null
  condition_in: string | null
  notes: string | null
  signature_data_url: string | null
  status: LoanStatus
  created_at: string
  updated_at: string
}

export type CompanyProfile = {
  owner_id: string
  company_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  updated_at: string
}

export type QuotationStatus = 'draft' | 'terkirim' | 'diterima' | 'ditolak'

export type Quotation = {
  id: string
  owner_id: string
  project_id: string
  quote_number: string | null
  quote_date: string
  valid_until: string | null
  client_name: string | null
  client_address: string | null
  client_contact: string | null
  greeting: string | null
  closing_notes: string | null
  discount_percent: number
  status: QuotationStatus
  created_at: string
  updated_at: string
}

export type PurchaseOrderStatus = 'ordered' | 'invoiced' | 'paid' | 'cancelled'

export type PurchaseOrder = {
  id: string
  owner_id: string
  project_id: string
  supplier_id: string | null
  supplier_name: string | null
  po_number: string | null
  po_date: string
  status: PurchaseOrderStatus
  invoice_number: string | null
  invoice_amount: number | null
  invoice_url: string | null
  invoice_date: string | null
  total_amount: number
  retensi_pct: number
  payment_id: string | null
  received: boolean
  note: string | null
  created_at: string
  updated_at: string
}

export type PurchaseOrderItem = {
  id: string
  po_id: string
  material_id: string | null
  material_name: string
  qty: number
  unit: string
  unit_price: number
  total: number
  sort: number
}

export type PurchasePayment = {
  id: string
  owner_id: string
  supplier_name: string | null
  total_amount: number
  proof_url: string | null
  note: string | null
  po_ids: string[]
  paid_at: string
  created_at: string
}

export type ProjectWarehouse = {
  id: string
  owner_id: string
  project_id: string
  name: string
  address: string | null
  is_active: boolean
  created_at: string
}

export type WarehouseStock = {
  id: string
  warehouse_id: string
  material_id: string
  qty: number
  avg_cost: number
  updated_at: string
}

export type WarehouseTransactionType = 'masuk' | 'keluar'

export type WarehouseTransaction = {
  id: string
  warehouse_id: string
  material_id: string
  type: WarehouseTransactionType
  qty: number
  unit_price: number
  reference: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export type SpkStatus = 'draft' | 'agreed' | 'in_progress' | 'done' | 'cancelled'
export type SpkApproverRole = 'project_manager' | 'designer' | 'finance' | 'admin' | 'pengawas' | 'spv_sales' | 'pemborong'

export type SpkApproval = {
  name?: string
  signature_url?: string
  signed_at?: string
}

export type ManpowerSpk = {
  id: string
  owner_id: string
  project_id: string
  manpower_plan_id: string | null
  spk_number: string | null
  client_name: string | null
  worker_name: string | null
  worker_phone: string | null
  spk_date: string
  start_date: string | null
  end_date: string | null
  grand_total: number
  status: SpkStatus
  sanksi_text: string | null
  note: string | null
  approvals: Partial<Record<SpkApproverRole, SpkApproval>>
  created_at: string
  updated_at: string
}

export type ManpowerSpkItem = {
  id: string
  spk_id: string
  description: string | null
  qty: number
  unit: string | null
  price: number
  total: number
  sort: number
}

export type ManpowerSpkClause = {
  id: string
  spk_id: string
  title: string | null
  body: string | null
  sort: number
}

export type SpkClauseTemplate = {
  id: string
  owner_id: string
  title: string | null
  body: string | null
  sort: number
  created_at: string
}

export type LabourTerminStatus = 'pending' | 'paid'

export type LabourTermin = {
  id: string
  owner_id: string
  spk_id: string | null
  project_id: string | null
  worker_name: string | null
  description: string | null
  amount: number
  status: LabourTerminStatus
  proof_url: string | null
  paid_at: string | null
  note: string | null
  sort: number
  created_at: string
}

export type WaSettings = {
  owner_id: string
  enabled: boolean
  api_url: string | null
  api_key: string | null
  instance: string | null
  api_version: 'auto' | 'v1' | 'v2'
  target_number: string | null
  updated_at: string
}

export type WaEventSetting = {
  id: string
  owner_id: string
  event_key: string
  enabled: boolean
  target_number: string | null
}

export type WaLog = {
  id: string
  owner_id: string
  event_key: string
  target: string | null
  message: string | null
  status: 'sent' | 'failed'
  response: string | null
  created_at: string
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

export type AiEstimationStatus = 'draft' | 'questions' | 'saved'

export type AiEstimation = {
  id: string
  owner_id: string
  project_id: string | null
  image_urls: string[]
  job_name: string | null
  hints: string | null
  template_id: string | null
  template_name: string | null
  confidence: string | null
  notes: string | null
  questions: unknown
  answers: Record<string, string>
  status: AiEstimationStatus
  model: string | null
  items_count: number | null
  created_at: string
  updated_at: string
}

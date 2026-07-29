'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcElement, type ElementDimensions } from '@/lib/volume-calc'
import { calcBaseTotal, type GenericDimensions } from '@/lib/volume-generic-calc'
import type { ElementType, FormulaType } from '@/types/database'

function numberOf(formData: FormData, key: string) {
  const v = Number(formData.get(key) ?? 0)
  return Number.isFinite(v) ? v : 0
}

export async function addStructuralElement(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const element_type = String(formData.get('element_type') ?? '') as ElementType
  const name = String(formData.get('name') ?? '').trim()
  const section = String(formData.get('section') ?? '').trim() || null
  const concrete_class = String(formData.get('concrete_class') ?? '').trim() || null

  if (!project_id || !element_type || !name) return

  const dims: ElementDimensions = {
    element_type,
    quantity: numberOf(formData, 'quantity') || 1,
    length_m: numberOf(formData, 'length_m'),
    width_m: numberOf(formData, 'width_m'),
    height_m: numberOf(formData, 'height_m'),
    thickness_m: numberOf(formData, 'thickness_m'),
    main_bar_dia_mm: numberOf(formData, 'main_bar_dia_mm'),
    main_bar_count: numberOf(formData, 'main_bar_count'),
    main_bar_spacing_m: numberOf(formData, 'main_bar_spacing_m'),
    stirrup_dia_mm: numberOf(formData, 'stirrup_dia_mm'),
    stirrup_spacing_m: numberOf(formData, 'stirrup_spacing_m'),
  }

  const result = calcElement(dims)

  await supabase.from('structural_elements').insert({
    project_id,
    element_type,
    name,
    section,
    concrete_class,
    quantity: dims.quantity,
    length_m: dims.length_m,
    width_m: dims.width_m,
    height_m: dims.height_m,
    thickness_m: dims.thickness_m,
    main_bar_dia_mm: dims.main_bar_dia_mm,
    main_bar_count: dims.main_bar_count,
    main_bar_spacing_m: dims.main_bar_spacing_m,
    stirrup_dia_mm: dims.stirrup_dia_mm,
    stirrup_spacing_m: dims.stirrup_spacing_m,
    ...result,
  })

  revalidatePath(`/projects/${project_id}/volume`)
}

export async function deleteStructuralElement(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  await supabase.from('structural_elements').delete().eq('id', id)
  revalidatePath(`/projects/${project_id}/volume`)
}

// Kirim hasil hitung 1 elemen struktur ke Rincian RAB sebagai 3 baris:
// beton, bekisting, pembesian. Harga satuan bisa diisi dari referensi AHSP (opsional) atau manual belakangan.
export async function sendElementToRab(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const element_id = String(formData.get('element_id') ?? '')

  const { data: el } = await supabase
    .from('structural_elements')
    .select('*')
    .eq('id', element_id)
    .single()

  if (!el) return

  const rows: {
    project_id: string
    section: string | null
    name: string
    unit: string
    volume: number
    unit_price: number
  }[] = []

  if (el.volume_beton_m3 > 0) {
    rows.push({
      project_id,
      section: el.section,
      name: `Beton ${el.name}${el.concrete_class ? ` (${el.concrete_class})` : ''}`,
      unit: 'm3',
      volume: el.volume_beton_m3,
      unit_price: 0,
    })
  }
  if (el.volume_bekisting_m2 > 0) {
    rows.push({
      project_id,
      section: el.section,
      name: `Bekisting ${el.name}`,
      unit: 'm2',
      volume: el.volume_bekisting_m2,
      unit_price: 0,
    })
  }
  if (el.berat_besi_kg > 0) {
    rows.push({
      project_id,
      section: el.section,
      name: `Pembesian ${el.name}`,
      unit: 'kg',
      volume: el.berat_besi_kg,
      unit_price: 0,
    })
  }

  if (rows.length > 0) {
    await supabase.from('rab_items').insert(rows)
  }

  revalidatePath(`/projects/${project_id}`)
  revalidatePath(`/projects/${project_id}/volume`)
}

// ============================================================
// Fase D: Resep Volume Generik (formula pxlxt/pxl/keliling/trapesium/custom)
// ============================================================

export async function addVolumeGenericEntry(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const recipe_id = String(formData.get('recipe_id') ?? '') || null
  const recipe_name = String(formData.get('recipe_name') ?? '').trim()
  const formula_type = String(formData.get('formula_type') ?? '') as FormulaType
  const name = String(formData.get('name') ?? '').trim()
  const section = String(formData.get('section') ?? '').trim() || null

  if (!project_id || !recipe_name || !formula_type || !name) return

  const dims: GenericDimensions = {
    formula_type,
    quantity: numberOf(formData, 'quantity') || 1,
    panjang_m: numberOf(formData, 'panjang_m'),
    lebar_m: numberOf(formData, 'lebar_m'),
    lebar_atas_m: numberOf(formData, 'lebar_atas_m'),
    lebar_bawah_m: numberOf(formData, 'lebar_bawah_m'),
    tinggi_m: numberOf(formData, 'tinggi_m'),
    custom_volume: numberOf(formData, 'custom_volume'),
  }

  const base_volume = calcBaseTotal(dims)

  await supabase.from('volume_generic_entries').insert({
    project_id,
    recipe_id,
    recipe_name,
    formula_type,
    name,
    section,
    quantity: dims.quantity,
    panjang_m: dims.panjang_m,
    lebar_m: dims.lebar_m,
    lebar_atas_m: dims.lebar_atas_m,
    lebar_bawah_m: dims.lebar_bawah_m,
    tinggi_m: dims.tinggi_m,
    custom_volume: dims.custom_volume,
    base_volume,
  })

  revalidatePath(`/projects/${project_id}/volume`)
}

export async function deleteVolumeGenericEntry(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  await supabase.from('volume_generic_entries').delete().eq('id', id)
  revalidatePath(`/projects/${project_id}/volume`)
}

// Kirim satu entry ke Rincian RAB sebagai beberapa baris (sesuai item resep x koefisien x base_volume).
// Harga satuan diambil dari referensi AHSP item resep bila ada, selain itu 0 (diisi manual belakangan).
export async function sendVolumeGenericEntryToRab(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const entry_id = String(formData.get('entry_id') ?? '')

  const { data: entry } = await supabase
    .from('volume_generic_entries')
    .select('*')
    .eq('id', entry_id)
    .single()

  if (!entry) return

  const { data: recipeItems } = await supabase
    .from('volume_recipe_items')
    .select('*, ahsp_items(name, unit, unit_price, tkdn_percent)')
    .eq('recipe_id', entry.recipe_id ?? '')
    .order('sort_order')

  if (!recipeItems || recipeItems.length === 0) return

  const rows = recipeItems.map((ri) => {
    const ahsp = ri.ahsp_items as { name: string; unit: string; unit_price: number; tkdn_percent: number } | null
    return {
      project_id,
      section: entry.section,
      ahsp_item_id: ri.ahsp_item_id,
      name: `${ri.name} - ${entry.name}`,
      unit: ri.unit,
      volume: Math.round(entry.base_volume * ri.coefficient * 10000) / 10000,
      unit_price: ahsp?.unit_price ?? 0,
      tkdn_percent: ahsp?.tkdn_percent ?? 0,
    }
  })

  await supabase.from('rab_items').insert(rows)

  revalidatePath(`/projects/${project_id}`)
  revalidatePath(`/projects/${project_id}/volume`)
}

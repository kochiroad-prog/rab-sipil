'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcElement, type ElementDimensions } from '@/lib/volume-calc'
import type { ElementType } from '@/types/database'

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

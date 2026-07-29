'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function numOrNull(formData: FormData, key: string) {
  const v = formData.get(key)
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function addMaterial(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  const unit = String(formData.get('unit') ?? '').trim()
  if (!name || !unit) return

  const aliasesRaw = String(formData.get('aliases') ?? '').trim()
  const aliases = aliasesRaw ? aliasesRaw.split(',').map((s) => s.trim()).filter(Boolean) : null

  await supabase.from('materials').insert({
    owner_id: user.id,
    category: String(formData.get('category') ?? 'lainnya'),
    kind: String(formData.get('kind') ?? 'bulk'),
    code: String(formData.get('code') ?? '').trim() || null,
    name,
    unit,
    price: Number(formData.get('price') ?? 0),
    waste_pct: Number(formData.get('waste_pct') ?? 0),
    length_mm: numOrNull(formData, 'length_mm'),
    diameter_mm: numOrNull(formData, 'diameter_mm'),
    sheet_width_mm: numOrNull(formData, 'sheet_width_mm'),
    sheet_height_mm: numOrNull(formData, 'sheet_height_mm'),
    coverage_per_unit: numOrNull(formData, 'coverage_per_unit'),
    consumption_per_m2: numOrNull(formData, 'consumption_per_m2'),
    tkdn_percent: Number(formData.get('tkdn_percent') ?? 0),
    aliases,
    brand: String(formData.get('brand') ?? '').trim() || null,
    specification: String(formData.get('specification') ?? '').trim() || null,
    supplier_id: String(formData.get('supplier_id') ?? '').trim() || null,
    image_url: String(formData.get('image_url') ?? '').trim() || null,
  })

  revalidatePath('/materials')
}

export async function deleteMaterial(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('materials').delete().eq('id', id)
  revalidatePath('/materials')
}

export async function updateMaterialPrice(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const price = Number(formData.get('price') ?? 0)
  await supabase.from('materials').update({ price }).eq('id', id)
  revalidatePath('/materials')
}

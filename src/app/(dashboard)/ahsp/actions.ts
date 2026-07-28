'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addAhspItem(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  const unit = String(formData.get('unit') ?? '').trim()
  const unit_price = Number(formData.get('unit_price') ?? 0)
  const tkdn_percent = Number(formData.get('tkdn_percent') ?? 0)
  const code = String(formData.get('code') ?? '').trim() || null
  const category_id = String(formData.get('category_id') ?? '') || null

  if (!name || !unit) return

  await supabase.from('ahsp_items').insert({
    owner_id: user.id,
    name,
    unit,
    unit_price,
    tkdn_percent,
    code,
    category_id,
  })

  revalidatePath('/ahsp')
}

export async function deleteAhspItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('ahsp_items').delete().eq('id', id)
  revalidatePath('/ahsp')
}

export async function addAhspComponent(formData: FormData) {
  const supabase = await createClient()
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '')
  const component_type = String(formData.get('component_type') ?? 'material')
  const material_id = String(formData.get('material_id') ?? '') || null
  const coefficient = Number(formData.get('coefficient') ?? 0)
  let name = String(formData.get('name') ?? '').trim()
  let unit = String(formData.get('unit') ?? '').trim()
  let unit_price = Number(formData.get('unit_price') ?? 0)
  let tkdn_percent = Number(formData.get('tkdn_percent') ?? 0)

  if (!ahsp_item_id) return

  if (material_id) {
    const { data: mat } = await supabase
      .from('materials')
      .select('name, unit, price, tkdn_percent')
      .eq('id', material_id)
      .single()
    if (mat) {
      name = name || mat.name
      unit = unit || mat.unit
      unit_price = unit_price || mat.price
      tkdn_percent = tkdn_percent || mat.tkdn_percent
    }
  }

  if (!name || !unit) return

  await supabase.from('ahsp_components').insert({
    ahsp_item_id,
    material_id,
    component_type,
    name,
    unit,
    coefficient,
    unit_price,
    tkdn_percent,
  })

  revalidatePath(`/ahsp/${ahsp_item_id}`)
}

export async function deleteAhspComponent(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '')
  await supabase.from('ahsp_components').delete().eq('id', id)
  revalidatePath(`/ahsp/${ahsp_item_id}`)
}

/** Sinkronkan unit_price AHSP dari total komposisi (Σ koefisien × harga) + overhead 10% default. */
export async function syncAhspPriceFromComponents(formData: FormData) {
  const supabase = await createClient()
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '')
  const overheadPercent = Number(formData.get('overhead_percent') ?? 10)

  const { data: components } = await supabase
    .from('ahsp_components')
    .select('coefficient, unit_price, tkdn_percent')
    .eq('ahsp_item_id', ahsp_item_id)

  if (!components || components.length === 0) return

  const subtotal = components.reduce((s, c) => s + c.coefficient * c.unit_price, 0)
  const tkdnValue = components.reduce((s, c) => s + c.coefficient * c.unit_price * (c.tkdn_percent / 100), 0)
  const withOverhead = subtotal * (1 + overheadPercent / 100)
  const tkdnPercent = subtotal > 0 ? (tkdnValue / subtotal) * 100 : 0

  await supabase
    .from('ahsp_items')
    .update({ unit_price: Math.round(withOverhead), tkdn_percent: Math.round(tkdnPercent * 100) / 100 })
    .eq('id', ahsp_item_id)

  revalidatePath(`/ahsp/${ahsp_item_id}`)
  revalidatePath('/ahsp')
}

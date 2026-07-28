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
  const code = String(formData.get('code') ?? '').trim() || null
  const category_id = String(formData.get('category_id') ?? '') || null

  if (!name || !unit) return

  await supabase.from('ahsp_items').insert({
    owner_id: user.id,
    name,
    unit,
    unit_price,
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

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FormulaType } from '@/types/database'

export async function addVolumeRecipe(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  const formula_type = String(formData.get('formula_type') ?? '') as FormulaType
  const description = String(formData.get('description') ?? '').trim() || null

  if (!name || !formula_type) return

  await supabase.from('volume_recipes').insert({
    owner_id: user.id,
    name,
    formula_type,
    description,
  })

  revalidatePath('/volume-recipes')
}

export async function deleteVolumeRecipe(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('volume_recipes').delete().eq('id', id)
  revalidatePath('/volume-recipes')
}

export async function addVolumeRecipeItem(formData: FormData) {
  const supabase = await createClient()
  const recipe_id = String(formData.get('recipe_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const unit = String(formData.get('unit') ?? '').trim()
  const coefficient = Number(formData.get('coefficient') ?? 1)
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '') || null

  if (!recipe_id || !name || !unit) return

  await supabase.from('volume_recipe_items').insert({
    recipe_id,
    name,
    unit,
    coefficient,
    ahsp_item_id,
  })

  revalidatePath('/volume-recipes')
}

export async function deleteVolumeRecipeItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('volume_recipe_items').delete().eq('id', id)
  revalidatePath('/volume-recipes')
}

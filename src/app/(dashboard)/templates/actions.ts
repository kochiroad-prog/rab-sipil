'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  const keywordsRaw = String(formData.get('keywords') ?? '').trim()
  const keywords = keywordsRaw ? keywordsRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
  const description = String(formData.get('description') ?? '').trim() || null

  const { data, error } = await supabase
    .from('job_templates')
    .insert({ owner_id: user.id, name, keywords, description })
    .select('id')
    .single()

  if (error || !data) return
  revalidatePath('/templates')
  redirect(`/templates/${data.id}`)
}

export async function deleteTemplate(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('job_templates').delete().eq('id', id)
  revalidatePath('/templates')
  redirect('/templates')
}

export async function addTemplateQuestion(formData: FormData) {
  const supabase = await createClient()
  const template_id = String(formData.get('template_id') ?? '')
  const key = String(formData.get('key') ?? '').trim()
  const label = String(formData.get('label') ?? '').trim()
  const qtype = String(formData.get('qtype') ?? 'single')
  const unit = String(formData.get('unit') ?? '').trim() || null
  const optionsRaw = String(formData.get('options') ?? '').trim()
  const options = optionsRaw ? optionsRaw.split(',').map((s) => s.trim()).filter(Boolean) : []

  if (!template_id || !key || !label) return

  await supabase.from('job_template_questions').insert({ template_id, key, label, qtype, unit, options })
  revalidatePath(`/templates/${template_id}`)
}

export async function deleteTemplateQuestion(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const template_id = String(formData.get('template_id') ?? '')
  await supabase.from('job_template_questions').delete().eq('id', id)
  revalidatePath(`/templates/${template_id}`)
}

export async function addTemplateItem(formData: FormData) {
  const supabase = await createClient()
  const template_id = String(formData.get('template_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const unit = String(formData.get('unit') ?? '').trim()
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '') || null
  const formula = String(formData.get('formula') ?? '').trim() || null
  const coefficient = Number(formData.get('coefficient') ?? 1) || 1

  if (!template_id || !name || !unit) return

  await supabase.from('job_template_items').insert({ template_id, name, unit, ahsp_item_id, formula, coefficient })
  revalidatePath(`/templates/${template_id}`)
}

export async function deleteTemplateItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const template_id = String(formData.get('template_id') ?? '')
  await supabase.from('job_template_items').delete().eq('id', id)
  revalidatePath(`/templates/${template_id}`)
}

export async function updateTemplateItemFormula(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const template_id = String(formData.get('template_id') ?? '')
  const formula = String(formData.get('formula') ?? '').trim() || null
  const coefficient = Number(formData.get('coefficient') ?? 1) || 1

  if (!id) return

  await supabase.from('job_template_items').update({ formula, coefficient }).eq('id', id)
  revalidatePath(`/templates/${template_id}`)
}

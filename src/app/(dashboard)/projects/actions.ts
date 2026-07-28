'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = String(formData.get('name') ?? '').trim()
  const client_name = String(formData.get('client_name') ?? '').trim() || null
  const location = String(formData.get('location') ?? '').trim() || null
  const description = String(formData.get('description') ?? '').trim() || null

  if (!name) return

  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: user.id, name, client_name, location, description })
    .select('id')
    .single()

  if (error || !data) {
    redirect(`/projects/new?error=${encodeURIComponent(error?.message ?? 'Gagal membuat proyek')}`)
  }

  revalidatePath('/projects')
  redirect(`/projects/${data.id}`)
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('projects').delete().eq('id', id)
  revalidatePath('/projects')
  redirect('/projects')
}

export async function addRabItem(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const unit = String(formData.get('unit') ?? '').trim()
  const volume = Number(formData.get('volume') ?? 0)
  const unit_price = Number(formData.get('unit_price') ?? 0)
  const section = String(formData.get('section') ?? '').trim() || null
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '') || null

  if (!name || !unit || !project_id) return

  await supabase.from('rab_items').insert({
    project_id,
    name,
    unit,
    volume,
    unit_price,
    section,
    ahsp_item_id,
  })

  revalidatePath(`/projects/${project_id}`)
}

export async function deleteRabItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  await supabase.from('rab_items').delete().eq('id', id)
  revalidatePath(`/projects/${project_id}`)
}

export async function fillFromAhsp(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const ahsp_item_id = String(formData.get('ahsp_item_id') ?? '')
  const volume = Number(formData.get('volume') ?? 0)
  const section = String(formData.get('section') ?? '').trim() || null

  const { data: ahsp } = await supabase
    .from('ahsp_items')
    .select('name, unit, unit_price')
    .eq('id', ahsp_item_id)
    .single()

  if (!ahsp) return

  await supabase.from('rab_items').insert({
    project_id,
    ahsp_item_id,
    name: ahsp.name,
    unit: ahsp.unit,
    unit_price: ahsp.unit_price,
    volume,
    section,
  })

  revalidatePath(`/projects/${project_id}`)
}

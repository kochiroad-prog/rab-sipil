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

export async function updateProjectSettings(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const ppn_percent = Number(formData.get('ppn_percent') ?? 11)
  const overhead_percent = Number(formData.get('overhead_percent') ?? 10)
  const tahun_anggaran = formData.get('tahun_anggaran')
    ? Number(formData.get('tahun_anggaran'))
    : null

  await supabase
    .from('projects')
    .update({ ppn_percent, overhead_percent, tahun_anggaran })
    .eq('id', id)

  revalidatePath(`/projects/${id}`)
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
  let tkdn_percent = Number(formData.get('tkdn_percent') ?? 0)

  if (!name || !unit || !project_id) return

  if (!tkdn_percent && ahsp_item_id) {
    const { data: ahsp } = await supabase
      .from('ahsp_items')
      .select('tkdn_percent')
      .eq('id', ahsp_item_id)
      .single()
    tkdn_percent = ahsp?.tkdn_percent ?? 0
  }

  await supabase.from('rab_items').insert({
    project_id,
    name,
    unit,
    volume,
    unit_price,
    section,
    ahsp_item_id,
    tkdn_percent,
  })

  revalidatePath(`/projects/${project_id}`)
}

export async function updateRabItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  const unit_price = Number(formData.get('unit_price') ?? 0)
  const tkdn_percent = Number(formData.get('tkdn_percent') ?? 0)

  await supabase.from('rab_items').update({ unit_price, tkdn_percent }).eq('id', id)
  revalidatePath(`/projects/${project_id}`)
}

export async function deleteRabItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const project_id = String(formData.get('project_id') ?? '')
  await supabase.from('rab_items').delete().eq('id', id)
  revalidatePath(`/projects/${project_id}`)
}

export type DraftItemInput = {
  name: string
  unit: string
  volume: number
  ahsp_item_id?: string | null
  unit_price?: number
  tkdn_percent?: number
}

/** Insert batch draft item hasil AI Estimator (setelah diverifikasi user) sebagai rab_items baru. */
export async function insertDraftItems(projectId: string, section: string | null, items: DraftItemInput[]) {
  const supabase = await createClient()
  if (!projectId || items.length === 0) return { error: null }

  const rows = items
    .filter((it) => it.name && it.unit)
    .map((it) => ({
      project_id: projectId,
      section,
      name: it.name,
      unit: it.unit,
      volume: it.volume || 0,
      ahsp_item_id: it.ahsp_item_id ?? null,
      unit_price: it.unit_price ?? 0,
      tkdn_percent: it.tkdn_percent ?? 0,
    }))

  if (rows.length === 0) return { error: null }

  const { error } = await supabase.from('rab_items').insert(rows)
  revalidatePath(`/projects/${projectId}`)
  return { error: error?.message ?? null }
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

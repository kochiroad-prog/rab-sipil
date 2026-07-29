'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SpkApproverRole } from '@/types/database'

const DEFAULT_CLAUSES: { title: string; body: string }[] = [
  {
    title: 'Retensi / Jaminan Pemeliharaan',
    body: 'Sebesar 5% dari nilai borongan ditahan sebagai jaminan pemeliharaan, dibayarkan setelah masa pemeliharaan 90 hari kalender selesai dan tidak ada cacat pekerjaan.',
  },
  {
    title: 'Denda Keterlambatan',
    body: 'Keterlambatan penyelesaian pekerjaan dari jadwal yang disepakati dikenakan denda 1‰ (satu permil) per hari dari nilai borongan, maksimal 5% dari nilai borongan.',
  },
  {
    title: 'K3 & Keselamatan Kerja',
    body: 'Pemborong wajib menyediakan alat pelindung diri (APD) bagi seluruh pekerjanya dan mematuhi prosedur keselamatan kerja di lokasi proyek. Kecelakaan kerja akibat kelalaian menjadi tanggung jawab pemborong.',
  },
  {
    title: 'Ketentuan Material',
    body: 'Material kerja disediakan oleh pemberi kerja kecuali disebutkan lain dalam rincian pekerjaan. Nilai borongan pada dokumen ini adalah upah jasa kerja.',
  },
  {
    title: 'Serah Terima Pekerjaan',
    body: 'Pekerjaan dinyatakan selesai setelah pemeriksaan bersama oleh kedua pihak dan Berita Acara Serah Terima ditandatangani.',
  },
]

function strOrNull(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim()
  return v || null
}

export async function createSpk(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const projectId = String(formData.get('project_id') ?? '')
  if (!projectId) return

  const { data: spk, error } = await supabase
    .from('manpower_spk')
    .insert({
      owner_id: user.id,
      project_id: projectId,
      manpower_plan_id: strOrNull(formData, 'manpower_plan_id'),
      client_name: strOrNull(formData, 'client_name'),
      worker_name: strOrNull(formData, 'worker_name'),
      worker_phone: strOrNull(formData, 'worker_phone'),
      spk_date: strOrNull(formData, 'spk_date') ?? new Date().toISOString().slice(0, 10),
      start_date: strOrNull(formData, 'start_date'),
      end_date: strOrNull(formData, 'end_date'),
      sanksi_text: strOrNull(formData, 'sanksi_text'),
    })
    .select('id')
    .single()

  if (error || !spk) return

  await supabase.from('manpower_spk_clauses').insert(
    DEFAULT_CLAUSES.map((c, idx) => ({ spk_id: spk.id, title: c.title, body: c.body, sort: idx }))
  )

  revalidatePath(`/projects/${projectId}/manpower/spk`)
  redirect(`/projects/${projectId}/manpower/spk/${spk.id}`)
}

export async function updateSpkHeader(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')

  await supabase
    .from('manpower_spk')
    .update({
      client_name: strOrNull(formData, 'client_name'),
      worker_name: strOrNull(formData, 'worker_name'),
      worker_phone: strOrNull(formData, 'worker_phone'),
      spk_date: strOrNull(formData, 'spk_date'),
      start_date: strOrNull(formData, 'start_date'),
      end_date: strOrNull(formData, 'end_date'),
      sanksi_text: strOrNull(formData, 'sanksi_text'),
      note: strOrNull(formData, 'note'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath(`/projects/${projectId}/manpower/spk/${id}`)
}

async function recomputeGrandTotal(supabase: Awaited<ReturnType<typeof createClient>>, spkId: string) {
  const { data: items } = await supabase.from('manpower_spk_items').select('total').eq('spk_id', spkId)
  const grandTotal = (items ?? []).reduce((s, it) => s + Number(it.total || 0), 0)
  await supabase.from('manpower_spk').update({ grand_total: grandTotal }).eq('id', spkId)
}

export async function addSpkItem(formData: FormData) {
  const supabase = await createClient()
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const qty = Number(formData.get('qty') ?? 1)
  const price = Number(formData.get('price') ?? 0)

  await supabase.from('manpower_spk_items').insert({
    spk_id: spkId,
    description: strOrNull(formData, 'description'),
    qty,
    unit: strOrNull(formData, 'unit'),
    price,
    total: qty * price,
  })

  await recomputeGrandTotal(supabase, spkId)
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function deleteSpkItem(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')

  await supabase.from('manpower_spk_items').delete().eq('id', id)
  await recomputeGrandTotal(supabase, spkId)
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function addClause(formData: FormData) {
  const supabase = await createClient()
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')

  const { count } = await supabase
    .from('manpower_spk_clauses')
    .select('*', { count: 'exact', head: true })
    .eq('spk_id', spkId)

  await supabase.from('manpower_spk_clauses').insert({
    spk_id: spkId,
    title: strOrNull(formData, 'title') ?? 'Klausul Baru',
    body: strOrNull(formData, 'body') ?? '',
    sort: count ?? 0,
  })

  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function deleteClause(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase.from('manpower_spk_clauses').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function saveClauseAsTemplate(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const title = strOrNull(formData, 'title')
  const body = strOrNull(formData, 'body')
  const projectId = String(formData.get('project_id') ?? '')
  const spkId = String(formData.get('spk_id') ?? '')
  if (!title) return

  await supabase.from('spk_clause_templates').insert({ owner_id: user.id, title, body })
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function addClauseFromTemplate(formData: FormData) {
  const supabase = await createClient()
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const templateId = String(formData.get('template_id') ?? '')
  if (!templateId) return

  const { data: tpl } = await supabase.from('spk_clause_templates').select('*').eq('id', templateId).maybeSingle()
  if (!tpl) return

  const { count } = await supabase
    .from('manpower_spk_clauses')
    .select('*', { count: 'exact', head: true })
    .eq('spk_id', spkId)

  await supabase.from('manpower_spk_clauses').insert({ spk_id: spkId, title: tpl.title, body: tpl.body, sort: count ?? 0 })
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function saveApproval(formData: FormData) {
  const supabase = await createClient()
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const role = String(formData.get('role') ?? '') as SpkApproverRole
  const name = strOrNull(formData, 'name')
  const signatureUrl = strOrNull(formData, 'signature_data_url')
  if (!spkId || !role) return

  const { data: spk } = await supabase.from('manpower_spk').select('approvals').eq('id', spkId).maybeSingle()
  const approvals = (spk?.approvals ?? {}) as Record<string, unknown>
  approvals[role] = { name, signature_url: signatureUrl, signed_at: new Date().toISOString() }

  await supabase.from('manpower_spk').update({ approvals, updated_at: new Date().toISOString() }).eq('id', spkId)
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
}

export async function addTermin(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const workerName = strOrNull(formData, 'worker_name')
  const amount = Number(formData.get('amount') ?? 0)

  const { count } = await supabase.from('labour_termins').select('*', { count: 'exact', head: true }).eq('spk_id', spkId)

  await supabase.from('labour_termins').insert({
    owner_id: user.id,
    spk_id: spkId,
    project_id: projectId,
    worker_name: workerName,
    description: strOrNull(formData, 'description'),
    amount,
    sort: count ?? 0,
  })

  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
  revalidatePath('/upah-kerja')
}

export async function deleteTermin(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const spkId = String(formData.get('spk_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase.from('labour_termins').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/manpower/spk/${spkId}`)
  revalidatePath('/upah-kerja')
}

export async function agreeSpk(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase.from('manpower_spk').update({ status: 'agreed', updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/projects/${projectId}/manpower/spk/${id}`)
  revalidatePath('/upah-kerja')
}

export async function updateSpkStatus(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const status = String(formData.get('status') ?? 'draft')
  await supabase.from('manpower_spk').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/projects/${projectId}/manpower/spk/${id}`)
  revalidatePath(`/projects/${projectId}/manpower/spk`)
}

export async function deleteSpk(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase.from('manpower_spk').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/manpower/spk`)
}

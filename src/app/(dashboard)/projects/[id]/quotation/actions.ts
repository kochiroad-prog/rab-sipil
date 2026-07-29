'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addQuotation(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const projectId = String(formData.get('project_id') ?? '')
  if (!projectId) return

  const { data, error } = await supabase
    .from('quotations')
    .insert({
      owner_id: user.id,
      project_id: projectId,
      quote_number: String(formData.get('quote_number') ?? '').trim() || null,
      quote_date: String(formData.get('quote_date') ?? '').trim() || new Date().toISOString().slice(0, 10),
      valid_until: String(formData.get('valid_until') ?? '').trim() || null,
      client_name: String(formData.get('client_name') ?? '').trim() || null,
      client_address: String(formData.get('client_address') ?? '').trim() || null,
      client_contact: String(formData.get('client_contact') ?? '').trim() || null,
      greeting: String(formData.get('greeting') ?? '').trim() || null,
      closing_notes: String(formData.get('closing_notes') ?? '').trim() || null,
      discount_percent: Number(formData.get('discount_percent') ?? 0),
    })
    .select('id')
    .single()

  if (error || !data) return
  revalidatePath(`/projects/${projectId}/quotation`)
  redirect(`/projects/${projectId}/quotation/${data.id}`)
}

export async function updateQuotationStatus(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const status = String(formData.get('status') ?? 'draft')
  await supabase.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/projects/${projectId}/quotation`)
  revalidatePath(`/projects/${projectId}/quotation/${id}`)
}

export async function deleteQuotation(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase.from('quotations').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/quotation`)
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function strOrNull(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim()
  return v || null
}

export async function recordInvoice(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  if (!id) return

  await supabase
    .from('purchase_orders')
    .update({
      invoice_number: strOrNull(formData, 'invoice_number'),
      invoice_amount: formData.get('invoice_amount') ? Number(formData.get('invoice_amount')) : null,
      invoice_url: strOrNull(formData, 'invoice_url'),
      invoice_date: strOrNull(formData, 'invoice_date') ?? new Date().toISOString().slice(0, 10),
      status: 'invoiced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath('/purchasing/po')
  revalidatePath('/purchasing/pembayaran')
  if (projectId) revalidatePath(`/projects/${projectId}/purchasing`)
  revalidatePath(`/purchasing/po/${id}`)
}

export async function payPurchaseOrders(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const poIdsRaw = formData.getAll('po_ids').map((v) => String(v))
  if (poIdsRaw.length === 0) return

  const supplierName = strOrNull(formData, 'supplier_name')
  const totalAmount = Number(formData.get('total_amount') ?? 0)
  const proofUrl = strOrNull(formData, 'proof_url')
  const note = strOrNull(formData, 'note')

  const { data: payment, error } = await supabase
    .from('purchase_payments')
    .insert({
      owner_id: user.id,
      supplier_name: supplierName,
      total_amount: totalAmount,
      proof_url: proofUrl,
      note,
      po_ids: poIdsRaw,
    })
    .select('id')
    .single()

  if (error || !payment) return

  await supabase
    .from('purchase_orders')
    .update({ status: 'paid', payment_id: payment.id, updated_at: new Date().toISOString() })
    .in('id', poIdsRaw)

  revalidatePath('/purchasing/po')
  revalidatePath('/purchasing/pembayaran')
}

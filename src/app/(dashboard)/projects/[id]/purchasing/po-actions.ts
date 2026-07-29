'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ItemPayload = { materialId: string | null; materialName: string; qty: number; unit: string; unitPrice: number }

export async function createPurchaseOrder(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const projectId = String(formData.get('project_id') ?? '')
  const supplierId = String(formData.get('supplier_id') ?? '').trim() || null
  const supplierName = String(formData.get('supplier_name') ?? '').trim() || null
  const retensiPct = Number(formData.get('retensi_pct') ?? 0)
  const itemsRaw = String(formData.get('items_json') ?? '[]')

  if (!projectId) return

  let items: ItemPayload[] = []
  try {
    items = JSON.parse(itemsRaw)
  } catch {
    return
  }
  if (!Array.isArray(items) || items.length === 0) return

  const totalAmount = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0)

  const { data: po, error } = await supabase
    .from('purchase_orders')
    .insert({
      owner_id: user.id,
      project_id: projectId,
      supplier_id: supplierId,
      supplier_name: supplierName,
      retensi_pct: Number.isFinite(retensiPct) ? retensiPct : 0,
      total_amount: totalAmount,
      status: 'ordered',
    })
    .select('id')
    .single()

  if (error || !po) return

  const rows = items.map((it, idx) => ({
    po_id: po.id,
    material_id: it.materialId,
    material_name: it.materialName,
    qty: it.qty,
    unit: it.unit,
    unit_price: it.unitPrice,
    total: it.qty * it.unitPrice,
    sort: idx,
  }))
  await supabase.from('purchase_order_items').insert(rows)

  revalidatePath(`/projects/${projectId}/purchasing`)
}

export async function cancelPurchaseOrder(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase.from('purchase_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/projects/${projectId}/purchasing`)
}

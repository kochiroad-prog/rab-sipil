'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

function strOrNull(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim()
  return v || null
}

async function applyStockDelta(
  supabase: SupabaseClient,
  warehouseId: string,
  materialId: string,
  qtyDelta: number,
  unitPrice: number
) {
  const { data: existing } = await supabase
    .from('warehouse_stock')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .eq('material_id', materialId)
    .maybeSingle()

  if (!existing) {
    await supabase.from('warehouse_stock').insert({
      warehouse_id: warehouseId,
      material_id: materialId,
      qty: Math.max(0, qtyDelta),
      avg_cost: qtyDelta > 0 ? unitPrice : 0,
      updated_at: new Date().toISOString(),
    })
    return
  }

  const oldQty = Number(existing.qty) || 0
  const oldAvg = Number(existing.avg_cost) || 0
  let newQty = oldQty + qtyDelta
  let newAvg = oldAvg
  if (qtyDelta > 0) {
    newAvg = newQty > 0 ? (oldQty * oldAvg + qtyDelta * unitPrice) / newQty : unitPrice
  }
  if (newQty < 0) newQty = 0

  await supabase
    .from('warehouse_stock')
    .update({ qty: newQty, avg_cost: newAvg, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
}

export async function updateWarehouseSettings(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  await supabase
    .from('project_warehouses')
    .update({ name: String(formData.get('name') ?? 'Direksi Keet').trim(), address: strOrNull(formData, 'address') })
    .eq('id', id)
  revalidatePath(`/projects/${projectId}/warehouse`)
}

export async function recordStockIn(formData: FormData) {
  const supabase = await createClient()
  const warehouseId = String(formData.get('warehouse_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const materialId = String(formData.get('material_id') ?? '')
  const qty = Number(formData.get('qty') ?? 0)
  const unitPrice = Number(formData.get('unit_price') ?? 0)
  if (!warehouseId || !materialId || qty <= 0) return

  await supabase.from('warehouse_transactions').insert({
    warehouse_id: warehouseId,
    material_id: materialId,
    type: 'masuk',
    qty,
    unit_price: unitPrice,
    reference: strOrNull(formData, 'reference'),
    note: strOrNull(formData, 'note'),
  })

  await applyStockDelta(supabase, warehouseId, materialId, qty, unitPrice)

  revalidatePath(`/projects/${projectId}/warehouse`)
}

export async function recordStockOut(formData: FormData) {
  const supabase = await createClient()
  const warehouseId = String(formData.get('warehouse_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  const materialId = String(formData.get('material_id') ?? '')
  const qty = Number(formData.get('qty') ?? 0)
  if (!warehouseId || !materialId || qty <= 0) return

  await supabase.from('warehouse_transactions').insert({
    warehouse_id: warehouseId,
    material_id: materialId,
    type: 'keluar',
    qty,
    unit_price: 0,
    reference: strOrNull(formData, 'reference'),
    note: strOrNull(formData, 'note'),
  })

  await applyStockDelta(supabase, warehouseId, materialId, -qty, 0)

  revalidatePath(`/projects/${projectId}/warehouse`)
}

export async function receivePurchaseOrderToWarehouse(formData: FormData) {
  const supabase = await createClient()
  const poId = String(formData.get('po_id') ?? '')
  const warehouseId = String(formData.get('warehouse_id') ?? '')
  const projectId = String(formData.get('project_id') ?? '')
  if (!poId || !warehouseId) return

  const { data: po } = await supabase.from('purchase_orders').select('po_number').eq('id', poId).maybeSingle()
  const { data: items } = await supabase.from('purchase_order_items').select('*').eq('po_id', poId)

  for (const it of items ?? []) {
    if (!it.material_id) continue
    await supabase.from('warehouse_transactions').insert({
      warehouse_id: warehouseId,
      material_id: it.material_id,
      type: 'masuk',
      qty: it.qty,
      unit_price: it.unit_price,
      reference: po?.po_number ?? null,
      note: 'Diterima dari PO',
    })
    await applyStockDelta(supabase, warehouseId, it.material_id, it.qty, it.unit_price)
  }

  await supabase.from('purchase_orders').update({ received: true }).eq('id', poId)

  revalidatePath(`/projects/${projectId}/warehouse`)
  revalidatePath(`/projects/${projectId}/purchasing/po/${poId}`)
}

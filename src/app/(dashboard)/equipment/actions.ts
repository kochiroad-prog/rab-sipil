'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addMonths } from '@/lib/equipment-service-status'

function numOrNull(formData: FormData, key: string) {
  const v = formData.get(key)
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function strOrNull(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim()
  return v || null
}

export async function addEquipment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  await supabase.from('equipment').insert({
    owner_id: user.id,
    code: strOrNull(formData, 'code'),
    category: String(formData.get('category') ?? 'lainnya'),
    name,
    brand: strOrNull(formData, 'brand'),
    model: strOrNull(formData, 'model'),
    serial_number: strOrNull(formData, 'serial_number'),
    condition: String(formData.get('condition') ?? 'baik'),
    location: strOrNull(formData, 'location'),
    purchase_date: strOrNull(formData, 'purchase_date'),
    purchase_price: numOrNull(formData, 'purchase_price'),
    next_service_date: strOrNull(formData, 'next_service_date'),
    service_interval_months: numOrNull(formData, 'service_interval_months'),
    notes: strOrNull(formData, 'notes'),
    image_url: strOrNull(formData, 'image_url'),
  })

  revalidatePath('/equipment')
}

export async function updateEquipment(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase
    .from('equipment')
    .update({
      code: strOrNull(formData, 'code'),
      category: String(formData.get('category') ?? 'lainnya'),
      name: String(formData.get('name') ?? '').trim(),
      brand: strOrNull(formData, 'brand'),
      model: strOrNull(formData, 'model'),
      serial_number: strOrNull(formData, 'serial_number'),
      condition: String(formData.get('condition') ?? 'baik'),
      location: strOrNull(formData, 'location'),
      purchase_date: strOrNull(formData, 'purchase_date'),
      purchase_price: numOrNull(formData, 'purchase_price'),
      next_service_date: strOrNull(formData, 'next_service_date'),
      service_interval_months: numOrNull(formData, 'service_interval_months'),
      notes: strOrNull(formData, 'notes'),
      image_url: strOrNull(formData, 'image_url'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath('/equipment')
  revalidatePath(`/equipment/${id}`)
}

export async function deleteEquipment(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('equipment').delete().eq('id', id)
  revalidatePath('/equipment')
}

export async function addLoan(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const equipmentId = String(formData.get('equipment_id') ?? '')
  const borrowerName = String(formData.get('borrower_name') ?? '').trim()
  if (!equipmentId || !borrowerName) return

  await supabase.from('equipment_loans').insert({
    owner_id: user.id,
    equipment_id: equipmentId,
    project_id: strOrNull(formData, 'project_id'),
    borrower_name: borrowerName,
    borrower_role: strOrNull(formData, 'borrower_role'),
    loan_date: strOrNull(formData, 'loan_date') ?? new Date().toISOString().slice(0, 10),
    expected_return_date: strOrNull(formData, 'expected_return_date'),
    condition_out: strOrNull(formData, 'condition_out'),
    notes: strOrNull(formData, 'notes'),
    status: 'dipinjam',
  })

  await supabase
    .from('equipment')
    .update({ condition: String(formData.get('condition_out') ?? 'baik') })
    .eq('id', equipmentId)

  revalidatePath('/equipment')
  revalidatePath(`/equipment/${equipmentId}`)
}

export async function returnLoan(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const equipmentId = String(formData.get('equipment_id') ?? '')
  if (!id) return

  const status = String(formData.get('status') ?? 'dikembalikan')
  const conditionIn = strOrNull(formData, 'condition_in')

  await supabase
    .from('equipment_loans')
    .update({
      actual_return_date: strOrNull(formData, 'actual_return_date') ?? new Date().toISOString().slice(0, 10),
      condition_in: conditionIn,
      notes: strOrNull(formData, 'notes'),
      signature_data_url: strOrNull(formData, 'signature_data_url'),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (equipmentId && conditionIn) {
    await supabase.from('equipment').update({ condition: conditionIn }).eq('id', equipmentId)
  }

  revalidatePath('/equipment')
  if (equipmentId) revalidatePath(`/equipment/${equipmentId}`)
  redirect(`/equipment/loans/${id}/receipt`)
}

export async function deleteLoan(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const equipmentId = String(formData.get('equipment_id') ?? '')
  await supabase.from('equipment_loans').delete().eq('id', id)
  revalidatePath('/equipment')
  if (equipmentId) revalidatePath(`/equipment/${equipmentId}`)
}

export async function addEquipmentService(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const equipmentId = String(formData.get('equipment_id') ?? '')
  if (!equipmentId) return

  const serviceDate = strOrNull(formData, 'service_date') ?? new Date().toISOString().slice(0, 10)
  const intervalRaw = formData.get('service_interval_months')
  const interval = intervalRaw !== null && intervalRaw !== '' ? Number(intervalRaw) : null
  const nextServiceDate = interval && Number.isFinite(interval) ? addMonths(serviceDate, interval) : null

  await supabase.from('equipment_services').insert({
    owner_id: user.id,
    equipment_id: equipmentId,
    service_date: serviceDate,
    service_type: String(formData.get('service_type') ?? 'rutin'),
    cost: numOrNull(formData, 'cost') ?? 0,
    vendor: strOrNull(formData, 'vendor'),
    notes: strOrNull(formData, 'notes'),
    receipt_url: strOrNull(formData, 'receipt_url'),
    next_service_date: nextServiceDate,
  })

  await supabase
    .from('equipment')
    .update({
      next_service_date: nextServiceDate,
      service_interval_months: interval ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', equipmentId)

  revalidatePath('/equipment')
  revalidatePath(`/equipment/${equipmentId}`)
}

export async function deleteEquipmentService(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  const equipmentId = String(formData.get('equipment_id') ?? '')
  await supabase.from('equipment_services').delete().eq('id', id)
  revalidatePath('/equipment')
  if (equipmentId) revalidatePath(`/equipment/${equipmentId}`)
}

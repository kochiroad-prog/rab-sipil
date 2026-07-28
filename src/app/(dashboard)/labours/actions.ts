'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addLabour(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  await supabase.from('labours').insert({
    owner_id: user.id,
    name,
    kategori: String(formData.get('kategori') ?? 'lainnya'),
    level: String(formData.get('level') ?? 'regular'),
    daily_rate: Number(formData.get('daily_rate') ?? 0),
    borongan_multiplier: Number(formData.get('borongan_multiplier') ?? 1),
    notes: String(formData.get('notes') ?? '').trim() || null,
  })

  revalidatePath('/labours')
}

export async function deleteLabour(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('labours').delete().eq('id', id)
  revalidatePath('/labours')
}

export async function addWorkActivity(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const activity_name = String(formData.get('activity_name') ?? '').trim()
  const kategori_pekerjaan = String(formData.get('kategori_pekerjaan') ?? '').trim()
  const unit = String(formData.get('unit') ?? '').trim()
  if (!activity_name || !kategori_pekerjaan || !unit) return

  await supabase.from('work_activities').insert({
    owner_id: user.id,
    kategori_pekerjaan,
    activity_name,
    skill_kategori: String(formData.get('skill_kategori') ?? 'lainnya'),
    unit,
    productivity_rate: Number(formData.get('productivity_rate') ?? 0),
  })

  revalidatePath('/labours')
}

export async function deleteWorkActivity(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('work_activities').delete().eq('id', id)
  revalidatePath('/labours')
}

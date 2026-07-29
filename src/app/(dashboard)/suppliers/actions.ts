'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addSupplier(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  await supabase.from('suppliers').insert({
    owner_id: user.id,
    name,
    city: String(formData.get('city') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    maps_link: String(formData.get('maps_link') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  })

  revalidatePath('/suppliers')
}

export async function deleteSupplier(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  await supabase.from('suppliers').delete().eq('id', id)
  revalidatePath('/suppliers')
  revalidatePath('/materials')
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function payTermin(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const proofUrl = String(formData.get('proof_url') ?? '').trim() || null
  const note = String(formData.get('note') ?? '').trim() || null

  await supabase
    .from('labour_termins')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      proof_url: proofUrl,
      note,
    })
    .eq('id', id)

  revalidatePath('/upah-kerja')
}

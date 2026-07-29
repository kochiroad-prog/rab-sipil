'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyWa, rp } from '@/lib/wa-notify'

export async function payTermin(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const proofUrl = String(formData.get('proof_url') ?? '').trim() || null
  const note = String(formData.get('note') ?? '').trim() || null

  const { data: termin } = await supabase
    .from('labour_termins')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      proof_url: proofUrl,
      note,
    })
    .eq('id', id)
    .select('worker_name, description, amount')
    .single()

  if (termin) {
    await notifyWa(
      'pembayaran_berhasil',
      `Pembayaran upah berhasil\nPemborong: ${termin.worker_name ?? '-'}\nTermin: ${termin.description ?? '-'}\nJumlah: ${rp(termin.amount)}`
    )
  }

  revalidatePath('/upah-kerja')
}

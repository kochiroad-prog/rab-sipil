'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { buildWaConfig, sendWaText } from '@/lib/wa'
import { WA_EVENTS } from '@/lib/wa-notify'

function strOrNull(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? '').trim()
  return v || null
}

export async function updateWaSettings(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('wa_settings').upsert({
    owner_id: user.id,
    enabled: formData.get('enabled') === 'on',
    api_url: strOrNull(formData, 'api_url'),
    api_key: strOrNull(formData, 'api_key'),
    instance: strOrNull(formData, 'instance'),
    api_version: String(formData.get('api_version') ?? 'auto'),
    target_number: strOrNull(formData, 'target_number'),
    updated_at: new Date().toISOString(),
  })

  // Pastikan baris setelan per-event ada (default enabled) supaya halaman bisa menampilkannya.
  const { data: existing } = await supabase.from('wa_event_settings').select('event_key').eq('owner_id', user.id)
  const existingKeys = new Set((existing ?? []).map((e) => e.event_key))
  const missing = WA_EVENTS.filter((e) => !existingKeys.has(e.key))
  if (missing.length > 0) {
    await supabase.from('wa_event_settings').insert(missing.map((e) => ({ owner_id: user.id, event_key: e.key, enabled: true })))
  }

  revalidatePath('/settings/whatsapp')
}

export async function updateEventSetting(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const eventKey = String(formData.get('event_key') ?? '')
  if (!eventKey) return

  await supabase.from('wa_event_settings').upsert(
    {
      owner_id: user.id,
      event_key: eventKey,
      enabled: formData.get('enabled') === 'on',
      target_number: strOrNull(formData, 'target_number'),
    },
    { onConflict: 'owner_id,event_key' }
  )

  revalidatePath('/settings/whatsapp')
}

export async function testWaConnection(_formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: settings } = await supabase.from('wa_settings').select('*').eq('owner_id', user.id).maybeSingle()
  const cfg = buildWaConfig({
    apiUrl: settings?.api_url,
    apiKey: settings?.api_key,
    instance: settings?.instance,
    version: (settings?.api_version as 'auto' | 'v1' | 'v2') ?? 'auto',
  })

  let detail = 'Konfigurasi API belum lengkap (URL/API Key/Instance).'
  let status: 'sent' | 'failed' = 'failed'

  if (cfg) {
    const { checkConnection } = await import('@/lib/wa')
    const res = await checkConnection(cfg)
    detail = res.detail
    status = res.ok ? 'sent' : 'failed'

    if (res.ok && settings?.target_number) {
      const send = await sendWaText(cfg, { to: settings.target_number, text: 'Tes koneksi Notifikasi WA — Estimator Sipil berhasil.' })
      detail += send.ok ? ' Pesan tes terkirim.' : ` Gagal kirim pesan tes: ${send.detail}`
    }
  }

  await supabase.from('wa_logs').insert({
    owner_id: user.id,
    event_key: 'test_koneksi',
    target: settings?.target_number ?? null,
    message: 'Test Koneksi',
    status,
    response: detail.slice(0, 1000),
  })

  revalidatePath('/settings/whatsapp')
}

export async function retryQueueForOwner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: settings } = await supabase.from('wa_settings').select('*').eq('owner_id', user.id).maybeSingle()
  const cfg = buildWaConfig({
    apiUrl: settings?.api_url,
    apiKey: settings?.api_key,
    instance: settings?.instance,
    version: (settings?.api_version as 'auto' | 'v1' | 'v2') ?? 'auto',
  })
  if (!cfg || !settings?.enabled) {
    revalidatePath('/settings/whatsapp')
    return
  }

  const { data: items } = await supabase
    .from('wa_queue')
    .select('*')
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  for (const it of items ?? []) {
    const res = await sendWaText(cfg, { to: it.target as string, text: it.text as string })
    if (res.ok) {
      await supabase.from('wa_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', it.id)
    } else {
      const attempts = (Number(it.attempts) || 0) + 1
      const backoffMin = Math.min(attempts * 10, 120)
      await supabase
        .from('wa_queue')
        .update({
          attempts,
          last_error: res.detail?.slice(0, 500) ?? null,
          next_attempt_at: new Date(Date.now() + backoffMin * 60000).toISOString(),
          status: attempts >= 12 ? 'dead' : 'pending',
        })
        .eq('id', it.id)
    }
  }

  revalidatePath('/settings/whatsapp')
}

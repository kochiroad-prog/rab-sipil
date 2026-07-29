import { createClient } from '@/lib/supabase/server'
import { buildWaConfig, sendWaText } from './wa'

export const WA_EVENTS: { key: string; label: string }[] = [
  { key: 'invoice_masuk', label: 'Invoice supplier masuk' },
  { key: 'pembayaran_berhasil', label: 'Pembayaran berhasil (material/upah)' },
  { key: 'spk_disetujui', label: 'SPK disepakati' },
  { key: 'alat_telat', label: 'Alat belum dikembalikan' },
  { key: 'servis_alat', label: 'Jadwal servis alat' },
  { key: 'follow_up_penawaran', label: 'Follow-up Surat Penawaran' },
]

export type NotifyResult = { sent: boolean; reason: string }

/**
 * Kirim notifikasi WA untuk sebuah event. Aman dipanggil dari server action —
 * tidak pernah melempar error dan tidak menggagalkan transaksi utama.
 */
export async function notifyWa(eventKey: string, message: string): Promise<NotifyResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { sent: false, reason: 'Tidak ada sesi user.' }

    const { data: settings } = await supabase.from('wa_settings').select('*').eq('owner_id', user.id).maybeSingle()
    if (!settings?.enabled) return { sent: false, reason: 'Notifikasi WA masih nonaktif.' }

    const { data: ev } = await supabase
      .from('wa_event_settings')
      .select('*')
      .eq('owner_id', user.id)
      .eq('event_key', eventKey)
      .maybeSingle()
    if (ev && ev.enabled === false) return { sent: false, reason: 'Event ini dimatikan.' }

    const target = ev?.target_number || settings.target_number
    if (!target) return { sent: false, reason: 'Nomor tujuan belum diisi.' }

    const cfg = buildWaConfig({
      apiUrl: settings.api_url,
      apiKey: settings.api_key,
      instance: settings.instance,
      version: settings.api_version as 'auto' | 'v1' | 'v2',
    })
    if (!cfg) return { sent: false, reason: 'Konfigurasi API belum lengkap.' }

    const res = await sendWaText(cfg, { to: target, text: message })

    await supabase.from('wa_logs').insert({
      owner_id: user.id,
      event_key: eventKey,
      target,
      message,
      status: res.ok ? 'sent' : 'failed',
      response: res.detail?.slice(0, 1000) ?? null,
    })

    if (!res.ok) {
      await supabase.from('wa_queue').insert({
        owner_id: user.id,
        event_key: eventKey,
        target,
        text: message,
        status: 'pending',
        attempts: 0,
        last_error: res.detail?.slice(0, 500) ?? null,
      })
      return { sent: false, reason: (res.detail || 'gagal kirim') + ' — masuk antrean kirim-ulang' }
    }

    return { sent: true, reason: 'Terkirim' }
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'error tak terduga' }
  }
}

export function rp(n: number | null | undefined): string {
  return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID')
}

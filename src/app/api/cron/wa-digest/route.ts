import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { buildWaConfig, sendWaText } from '@/lib/wa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Cron harian: alat belum dikembalikan, jadwal servis alat (H-7 & terlambat),
 * dan follow-up Surat Penawaran yang belum direspons > 7 hari.
 * Perlu SUPABASE_SERVICE_ROLE_KEY di env Vercel. Lindungi dgn CRON_SECRET bila di-set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY belum diset di env Vercel.' }, { status: 200 })
  }
  const db = createAdmin(url, key, { auth: { persistSession: false } })

  const { data: settingsRows } = await db.from('wa_settings').select('*').eq('enabled', true)
  if (!settingsRows?.length) return NextResponse.json({ ok: true, owners: 0 })

  const today = new Date().toISOString().slice(0, 10)
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  let sent = 0

  for (const settings of settingsRows) {
    const ownerId = settings.owner_id as string
    const cfg = buildWaConfig({ apiUrl: settings.api_url, apiKey: settings.api_key, instance: settings.instance, version: settings.api_version })
    if (!cfg || !settings.target_number) continue

    const { data: eventRows } = await db.from('wa_event_settings').select('*').eq('owner_id', ownerId)
    const enabledEvents = new Set(
      ['alat_telat', 'servis_alat', 'follow_up_penawaran'].filter((k) => {
        const ev = eventRows?.find((e) => e.event_key === k)
        return !ev || ev.enabled !== false
      })
    )

    async function dispatch(eventKey: string, message: string) {
      const res = await sendWaText(cfg!, { to: settings.target_number as string, text: message })
      await db.from('wa_logs').insert({
        owner_id: ownerId,
        event_key: eventKey,
        target: settings.target_number,
        message,
        status: res.ok ? 'sent' : 'failed',
        response: res.detail?.slice(0, 1000) ?? null,
      })
      if (!res.ok) {
        await db.from('wa_queue').insert({
          owner_id: ownerId,
          event_key: eventKey,
          target: settings.target_number,
          text: message,
          status: 'pending',
          attempts: 0,
          last_error: res.detail?.slice(0, 500) ?? null,
        })
      } else {
        sent++
      }
    }

    // Alat belum dikembalikan
    if (enabledEvents.has('alat_telat')) {
      const { data: overdueLoans } = await db
        .from('equipment_loans')
        .select('borrower_name, expected_return_date, equipment:equipment_id(name)')
        .eq('owner_id', ownerId)
        .eq('status', 'dipinjam')
        .lt('expected_return_date', today)
      if (overdueLoans?.length) {
        const lines = overdueLoans
          .map((l) => {
            const eq = l.equipment as unknown as { name?: string } | null
            return `- ${eq?.name ?? '-'} (dipinjam ${l.borrower_name}, rencana kembali ${l.expected_return_date})`
          })
          .join('\n')
        await dispatch('alat_telat', `Alat belum dikembalikan:\n${lines}`)
      }
    }

    // Jadwal servis alat (H-7 & terlambat)
    if (enabledEvents.has('servis_alat')) {
      const { data: dueEquipment } = await db
        .from('equipment')
        .select('name, next_service_date')
        .eq('owner_id', ownerId)
        .not('next_service_date', 'is', null)
        .lte('next_service_date', in7)
      if (dueEquipment?.length) {
        const lines = dueEquipment
          .map((e) => `- ${e.name}: ${e.next_service_date}${e.next_service_date < today ? ' (TERLAMBAT)' : ''}`)
          .join('\n')
        await dispatch('servis_alat', `Jadwal servis alat:\n${lines}`)
      }
    }

    // Follow-up Surat Penawaran
    if (enabledEvents.has('follow_up_penawaran')) {
      const { data: staleQuotations } = await db
        .from('quotations')
        .select('quote_number, client_name, quote_date, project_id')
        .eq('owner_id', ownerId)
        .eq('status', 'terkirim')
        .lte('quote_date', sevenDaysAgo)
      if (staleQuotations?.length) {
        const lines = staleQuotations.map((q) => `- ${q.quote_number ?? '-'} (${q.client_name ?? '-'}, dikirim ${q.quote_date})`).join('\n')
        await dispatch('follow_up_penawaran', `Surat Penawaran belum direspons > 7 hari:\n${lines}`)
      }
    }
  }

  return NextResponse.json({ ok: true, owners: settingsRows.length, sent })
}

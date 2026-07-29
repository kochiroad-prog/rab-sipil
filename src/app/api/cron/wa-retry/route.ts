import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { buildWaConfig, sendWaText } from '@/lib/wa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_ATTEMPTS = 12
const BATCH = 60

/**
 * Cron kirim-ulang antrean WA (wa_queue), lintas semua owner.
 * Perlu SUPABASE_SERVICE_ROLE_KEY di env Vercel (untuk bypass RLS antar-owner).
 * Lindungi dengan header Authorization: Bearer <CRON_SECRET> bila di-set.
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

  const nowIso = new Date().toISOString()
  const { data: items } = await db
    .from('wa_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(BATCH)

  if (!items?.length) return NextResponse.json({ ok: true, processed: 0 })

  const cfgCache = new Map<string, ReturnType<typeof buildWaConfig>>()
  async function getCfg(ownerId: string) {
    if (cfgCache.has(ownerId)) return cfgCache.get(ownerId)!
    const { data: st } = await db.from('wa_settings').select('*').eq('owner_id', ownerId).maybeSingle()
    const cfg = st?.enabled
      ? buildWaConfig({ apiUrl: st.api_url, apiKey: st.api_key, instance: st.instance, version: st.api_version })
      : null
    cfgCache.set(ownerId, cfg)
    return cfg
  }

  let sent = 0
  let failed = 0
  let skipped = 0
  let dead = 0

  for (const it of items) {
    const ownerId = it.owner_id as string
    const cfg = await getCfg(ownerId)
    if (!cfg) {
      skipped++
      continue
    }

    const res = await sendWaText(cfg, { to: it.target as string, text: it.text as string })

    await db.from('wa_logs').insert({
      owner_id: ownerId,
      event_key: (it.event_key as string) + ':retry',
      target: it.target,
      message: it.text,
      status: res.ok ? 'sent' : 'failed',
      response: res.detail?.slice(0, 1000) ?? null,
    })

    if (res.ok) {
      await db.from('wa_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', it.id)
      sent++
    } else {
      const attempts = (Number(it.attempts) || 0) + 1
      const backoffMin = Math.min(attempts * 10, 120)
      const patch: Record<string, unknown> = {
        attempts,
        last_error: res.detail?.slice(0, 500) ?? null,
        next_attempt_at: new Date(Date.now() + backoffMin * 60000).toISOString(),
      }
      if (attempts >= MAX_ATTEMPTS) {
        patch.status = 'dead'
        dead++
      } else {
        failed++
      }
      await db.from('wa_queue').update(patch).eq('id', it.id)
    }
  }

  return NextResponse.json({ ok: true, processed: items.length, sent, failed, skipped, dead })
}

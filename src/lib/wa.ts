/**
 * Klien Evolution WhatsApp API (untuk Estimator Sipil — instance TERPISAH dari RAB Estima).
 * - Kredensial diambil dari tabel wa_settings (per-owner), diisi lewat halaman Notifikasi WA.
 * - Mendukung v1 & v2 dengan auto-detect (coba v2, fallback v1).
 * - Semua fungsi TIDAK melempar error ke pemanggil (fire-and-forget aman).
 */

export type WaVersion = 'auto' | 'v1' | 'v2'
export type WaConfig = { apiUrl: string; apiKey: string; instance: string; version?: WaVersion }

const TIMEOUT_MS = 15000

export function buildWaConfig(partial: {
  apiUrl?: string | null
  apiKey?: string | null
  instance?: string | null
  version?: WaVersion | null
}): WaConfig | null {
  let apiUrl = (partial.apiUrl || '').trim().replace(/\/+$/, '')
  if (apiUrl && !/^https?:\/\//i.test(apiUrl)) apiUrl = 'http://' + apiUrl
  const apiKey = (partial.apiKey || '').trim()
  const instance = (partial.instance || '').trim()
  if (!apiUrl || !apiKey || !instance) return null
  return { apiUrl, apiKey, instance, version: partial.version ?? 'auto' }
}

async function req(url: string, init: RequestInit & { apiKey: string }, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', apikey: init.apiKey, ...(init.headers ?? {}) },
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      /* biarkan text */
    }
    return { ok: res.ok, status: res.status, json, text }
  } catch (e) {
    return { ok: false, status: 0, json: null, text: e instanceof Error ? e.message : 'network error' }
  } finally {
    clearTimeout(t)
  }
}

/** Ubah nomor apa pun (08xx / +62xx / 62xx) menjadi JID WhatsApp. */
export function toJid(phone: string): string | null {
  const d = (phone || '').replace(/[^\d]/g, '')
  if (!d) return null
  let n = d
  if (n.startsWith('0')) n = '62' + n.slice(1)
  else if (n.startsWith('620')) n = '62' + n.slice(3)
  else if (!n.startsWith('62')) n = '62' + n
  if (n.length < 9) return null
  return `${n}@s.whatsapp.net`
}

function short(s: string | null | undefined, n = 160) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

/** Cek koneksi instance. Dipakai tombol "Test Koneksi". */
export async function checkConnection(cfg: WaConfig): Promise<{ ok: boolean; detail: string }> {
  const root = await req(`${cfg.apiUrl}/`, { method: 'GET', apiKey: cfg.apiKey }, 8000)
  if (root.status === 0) {
    return { ok: false, detail: `Server tidak bisa dihubungi (${short(root.text)}). Cek URL & jaringan.` }
  }
  const state = await req(`${cfg.apiUrl}/instance/connectionState/${cfg.instance}`, { method: 'GET', apiKey: cfg.apiKey }, 8000)
  if (state.status === 401 || state.status === 403) {
    return { ok: false, detail: `API key ditolak (${state.status}).` }
  }
  if (state.status === 404) {
    return { ok: false, detail: `Instance "${cfg.instance}" tidak ditemukan (404). Cek ejaan/huruf besar-kecil.` }
  }
  if (state.ok) {
    const st = JSON.stringify(state.json ?? '')
    if (/close|closed|disconnect/i.test(st)) {
      return { ok: true, detail: 'Terhubung ke server, tapi instance belum connect ke WhatsApp (scan QR dulu).' }
    }
    return { ok: true, detail: 'Instance terhubung.' }
  }
  return { ok: false, detail: `connectionState → ${state.status} ${short(state.text, 120)}` }
}

/** Kirim teks ke nomor. Auto-detect v2 → fallback v1. */
export async function sendWaText(cfg: WaConfig, opts: { to: string; text: string }): Promise<{ ok: boolean; detail: string }> {
  const url = `${cfg.apiUrl}/message/sendText/${cfg.instance}`

  const payloadV2: Record<string, unknown> = { number: opts.to, text: opts.text }
  const payloadV1: Record<string, unknown> = {
    number: opts.to,
    textMessage: { text: opts.text },
    options: { delay: 0, presence: 'composing' },
  }

  const order: { tag: string; body: Record<string, unknown> }[] =
    cfg.version === 'v1'
      ? [{ tag: 'v1', body: payloadV1 }]
      : cfg.version === 'v2'
        ? [{ tag: 'v2', body: payloadV2 }]
        : [{ tag: 'v2', body: payloadV2 }, { tag: 'v1', body: payloadV1 }]

  const errs: string[] = []
  for (const attempt of order) {
    const r = await req(url, { method: 'POST', apiKey: cfg.apiKey, body: JSON.stringify(attempt.body) })
    if (r.ok) return { ok: true, detail: 'terkirim' }
    errs.push(`[${attempt.tag}] ${r.status || 'no-resp'} ${short(r.text, 180)}`)
  }
  return { ok: false, detail: errs.join(' | ') || 'gagal kirim' }
}

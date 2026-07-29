/**
 * AI Estimator Sipil — Vision AI via OpenRouter.
 * AI HANYA membaca gambar (foto lokasi/gambar kerja) + jawaban user untuk menyusun DRAFT
 * rincian pekerjaan (nama, satuan, estimasi volume kalau terbaca). AI TIDAK menghitung
 * volume/biaya final secara presisi — itu tetap tugas Rule Engine (Backup Volume / AHSP)
 * dan verifikasi manusia sebelum masuk RAB.
 */

export type VisionQuestion = {
  key: string
  label: string
  type: 'single' | 'multi' | 'number'
  options?: string[]
  unit?: string
  allowCustom?: boolean
}

export type JobDetection = {
  job_name: string
  confidence: 'high' | 'medium' | 'low' | string
  questions: VisionQuestion[]
  notes: string
}

export type DraftRabItem = {
  name: string
  unit: string
  volume_estimate: number | null
  note: string
}

type ChatContent =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

async function callVision(messages: { role: string; content: string | ChatContent[] }[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY belum di-set di environment variables')
  const model = process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini'

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Estimator Sipil & Konstruksi',
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI tidak mengembalikan hasil. Coba ulangi atau ganti model.')
  return content
}

export function parseJSON<T>(text: string): T {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = t.indexOf('{')
  const startArr = t.indexOf('[')
  const useArr = startArr >= 0 && (start < 0 || startArr < start)
  if (useArr) {
    const end = t.lastIndexOf(']')
    if (startArr >= 0 && end > startArr) t = t.slice(startArr, end + 1)
  } else {
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) t = t.slice(start, end + 1)
  }
  return JSON.parse(t) as T
}

const DETECT_PROMPT = `Anda estimator ahli pekerjaan sipil & konstruksi di Indonesia.
TAHAP 1: Baca foto lokasi/gambar kerja (denah, potongan, atau foto lapangan) dan/atau keterangan estimator.
Tugas Anda HANYA:
1) Identifikasi jenis pekerjaan utama yang terlihat/dijelaskan (mis. "Pondasi Batu Kali", "Kolom Praktis", "Dinding Bata Merah", dsb). Boleh lebih dari satu jenis pekerjaan jika terlihat jelas berbeda.
2) Tentukan confidence (high/medium/low) — high hanya jika dimensi/ukuran benar-benar terbaca jelas di gambar.
3) Buat pertanyaan klarifikasi untuk hal yang menentukan volume & spesifikasi (dimensi, mutu bahan, campuran, dsb) yang belum jelas dari gambar/keterangan.
JANGAN menghitung volume atau biaya di tahap ini.

Balas HANYA JSON valid:
{
 "job_name": string,
 "confidence": "high"|"medium"|"low",
 "questions": [{"key": string, "label": string, "type": "single"|"multi"|"number", "options": [string], "unit": string, "allowCustom": boolean}],
 "notes": string
}`

export async function detectJob(
  imageDataUrls: string[],
  hints: string
): Promise<{ detection: JobDetection; model: string }> {
  const model = process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini'
  const content: ChatContent[] = [
    { type: 'text', text: `Analisa pekerjaan sipil/konstruksi.${hints ? ` Keterangan estimator: ${hints}` : ''}` },
    ...imageDataUrls.map((url): ChatContent => ({ type: 'image_url', image_url: { url } })),
  ]
  const raw = await callVision([
    { role: 'system', content: DETECT_PROMPT },
    { role: 'user', content },
  ])
  const obj = parseJSON<Record<string, unknown>>(raw)
  const detection: JobDetection = {
    job_name: String(obj.job_name ?? 'Pekerjaan'),
    confidence: (obj.confidence as string) ?? 'low',
    questions: Array.isArray(obj.questions) ? (obj.questions as VisionQuestion[]) : [],
    notes: String(obj.notes ?? ''),
  }
  return { detection, model }
}

const DRAFT_PROMPT = `Anda estimator ahli pekerjaan sipil & konstruksi di Indonesia.
TAHAP 2: Berdasarkan gambar (jika ada), jenis pekerjaan, dan jawaban user, susun DRAFT rincian item RAB.
- Setiap baris: name (uraian pekerjaan spesifik, mis. "Pasangan Batu Kali 1PC:4PP"), unit (m3/m2/kg/ls/dst),
  volume_estimate (angka jika bisa dihitung dari dimensi yang diberikan/terbaca di gambar, atau null jika tidak bisa),
  note (asumsi/rumus yang dipakai kalau volume_estimate diisi, atau alasan kenapa null).
- Kalau ada daftar "item standar" yang diberikan, USAHAKAN selaras dengan itu (boleh tambah/kurang sesuai konteks).
- JANGAN mengarang harga satuan. Hanya nama, satuan, dan estimasi volume.

Balas HANYA JSON array:
[{"name": string, "unit": string, "volume_estimate": number|null, "note": string}]`

export async function generateDraftItems(
  imageDataUrls: string[],
  jobName: string,
  answers: Record<string, string | string[]>,
  standardItems: string[]
): Promise<{ items: DraftRabItem[]; model: string }> {
  const model = process.env.OPENROUTER_VISION_MODEL || 'openai/gpt-4o-mini'
  const answerText = Object.entries(answers)
    .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join('\n')
  const content: ChatContent[] = [
    {
      type: 'text',
      text:
        `Jenis pekerjaan: ${jobName}\n\nJawaban user:\n${answerText}\n\n` +
        (standardItems.length
          ? `Item standar untuk jenis pekerjaan ini (referensi):\n${standardItems.map((s) => `- ${s}`).join('\n')}\n\n`
          : '') +
        `Susun draft rincian RAB sesuai jawaban di atas.`,
    },
    ...imageDataUrls.map((url): ChatContent => ({ type: 'image_url', image_url: { url } })),
  ]
  const raw = await callVision([
    { role: 'system', content: DRAFT_PROMPT },
    { role: 'user', content },
  ])
  const arr = parseJSON<Record<string, unknown>[]>(raw)
  const items: DraftRabItem[] = (Array.isArray(arr) ? arr : []).map((p) => ({
    name: String(p.name ?? 'Item'),
    unit: String(p.unit ?? 'ls'),
    volume_estimate: p.volume_estimate === null || p.volume_estimate === undefined ? null : Number(p.volume_estimate),
    note: String(p.note ?? ''),
  }))
  return { items, model }
}

/** Cocokkan job_name hasil deteksi ke Template Pekerjaan tersimpan (keyword match, bukan AI). */
export function matchTemplate<T extends { name: string; keywords: string[] }>(jobName: string, templates: T[]): T | null {
  const n = jobName.toLowerCase().trim()
  if (!n) return null
  let best: T | null = null
  let bestLen = 0
  for (const t of templates) {
    const candidates = [t.name, ...t.keywords]
    for (const c of candidates) {
      const cl = c.toLowerCase().trim()
      if (cl && (n.includes(cl) || cl.includes(n)) && cl.length > bestLen) {
        best = t
        bestLen = cl.length
      }
    }
  }
  return best
}

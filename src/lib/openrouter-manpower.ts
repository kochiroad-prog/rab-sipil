/**
 * AI Manpower Engine — satu panggilan OpenRouter, 3 layer dalam satu prompt:
 *  1) Analisa kebutuhan kerja: pekerjaan di RAB -> aktivitas kerja -> skill dibutuhkan
 *     (pakai Work Activities DB sebagai referensi produktivitas, boleh AI sesuaikan bila perlu)
 *  2) Rencana tim: jumlah orang & hari per skill + biaya
 *  3) Borongan Engine: bandingkan skema harian vs borongan, beri rekomendasi
 * Rule Engine (bukan AI) yang tetap menjumlah biaya akhir dari angka AI di sini —
 * lihat `summarizeManpower()`.
 */
import type { ManpowerAIResult } from '@/types/database'

const PROMPT = `Anda adalah perencana tenaga kerja (manpower planner) ahli proyek konstruksi sipil di Indonesia.
Berdasarkan daftar item RAB (uraian pekerjaan + volume + satuan) dan referensi produktivitas standar
(Work Activities DB) yang diberikan, kerjakan 3 hal sekaligus:

1) ANALISA KERJA: untuk tiap item RAB yang relevan (ada pekerjaan fisik, bukan item non-fisik seperti
   dokumen/perizinan), tentukan aktivitas kerja utama, skill yang dibutuhkan, dan produktivitas
   (pakai referensi Work Activities DB kalau ada yang cocok; kalau tidak ada, pakai estimasi wajar
   dan sebutkan itu asumsi). Hitung estimated_days = volume / productivity_rate.

2) RENCANA TIM: kelompokkan per skill, tentukan jumlah orang wajar (jangan cuma 1 orang untuk total
   puluhan hari — sebar ke beberapa orang bekerja paralel supaya durasi wajar), hari kerja, upah harian
   (pakai referensi kalau ada, atau estimasi UMK setempat wajar), dan total biaya per skill.

3) BORONGAN ENGINE: hitung total biaya skema harian (sum biaya rencana tim), lalu estimasi biaya
   skema borongan (per m3/m2/kg pekerjaan fisik, gunakan asumsi wajar harga borongan pasaran),
   bandingkan, dan beri rekomendasi ("harian" atau "borongan") dengan alasan singkat.

Balas HANYA JSON valid dengan struktur persis ini:
{
  "work_items": [{"rab_item_name": string, "activity": string, "skill": string, "volume": number, "unit": string, "productivity_rate": number, "estimated_days": number}],
  "team_plan": [{"skill": string, "count": number, "days": number, "daily_rate": number, "total_cost": number}],
  "borongan_comparison": {"harian_total": number, "borongan_estimate_total": number, "recommendation": "harian"|"borongan", "reasoning": string},
  "summary_days": number,
  "summary_cost": number
}`

type RabItemInput = { name: string; unit: string; volume: number }
type ActivityRef = { kategori_pekerjaan: string; activity_name: string; skill_kategori: string; unit: string; productivity_rate: number }

function parseJSON<T>(text: string): T {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t) as T
}

export async function generateManpowerPlan(
  rabItems: RabItemInput[],
  activityRefs: ActivityRef[]
): Promise<{ result: ManpowerAIResult; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY belum di-set di environment variables')
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

  const rabText = rabItems.map((it) => `- ${it.name} | ${it.volume} ${it.unit}`).join('\n')
  const refText = activityRefs
    .map((a) => `- [${a.kategori_pekerjaan}] ${a.activity_name} (skill: ${a.skill_kategori}) = ${a.productivity_rate} ${a.unit}`)
    .join('\n')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Estimator Sipil & Konstruksi',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: PROMPT },
        {
          role: 'user',
          content: `Daftar Item RAB:\n${rabText}\n\nWork Activities DB (referensi produktivitas):\n${refText}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI tidak mengembalikan hasil. Coba ulangi.')

  const result = parseJSON<ManpowerAIResult>(content)
  return { result, model }
}

/** Rescale rencana tim untuk target deadline baru — TANPA panggilan AI baru (Rule Engine). */
export function rescaleForDeadline(result: ManpowerAIResult, newDeadlineDays: number) {
  if (newDeadlineDays <= 0 || result.summary_days <= 0) return result
  const scale = result.summary_days / newDeadlineDays
  const team_plan = result.team_plan.map((row) => ({
    ...row,
    count: Math.max(1, Math.ceil(row.count * scale)),
    days: Math.max(1, Math.round(row.days / scale)),
  }))
  const summary_cost = team_plan.reduce((s, r) => s + r.count * r.days * r.daily_rate, 0)
  return { ...result, team_plan, summary_days: newDeadlineDays, summary_cost }
}

// Lapis ke-2 (opsional) untuk pencocokan AHSP: dipanggil HANYA untuk item yang skor
// pencocokan deterministiknya rendah/tidak ada. AI di sini TIDAK mengarang harga atau kode —
// ia cuma boleh memilih salah satu dari daftar kandidat yang sudah dihasilkan Rule Engine
// (findTopAhspMatches), atau bilang "tidak ada yang cocok". Hasil dari AI divalidasi ulang:
// kalau kode yang dikembalikan bukan bagian dari daftar kandidat yang diberikan, dianggap null.
// Ini menjaga prinsip "AI hanya identifikasi, bukan hitung angka final" tetap utuh.

import { askOpenRouter } from '@/lib/openrouter'
import { parseJSON } from '@/lib/openrouter-vision'
import type { AhspMatch } from '@/lib/ahsp-match'

export type ArbiterItem = { index: number; itemName: string; candidates: AhspMatch[] }

const ARBITER_PROMPT = `Anda ahli estimator AHSP konstruksi Indonesia.
Untuk tiap "item" di bawah, pilih SATU "id" kandidat AHSP dari daftar "candidates" miliknya yang PALING SESUAI
secara makna teknis dengan nama item tsb (perhatikan sinonim & istilah lokal, mis. "tembok"="dinding", "cor"="beton",
"batu belah"~"batu kali"). Kalau tidak ada kandidat yang benar-benar cocok, jawab null untuk item itu —
JANGAN memaksakan pilihan yang meleset, dan JANGAN pernah mengembalikan id yang tidak ada di daftar kandidat item tsb.

Balas HANYA JSON array (tanpa teks lain):
[{"index": number, "chosen_id": string|null}]`

/** Hasil: Map index item -> id kandidat AHSP terpilih (atau null kalau tidak ada yang cocok / gagal). */
export async function arbitrateAhspMatches(items: ArbiterItem[]): Promise<Map<number, string | null>> {
  const result = new Map<number, string | null>()
  const eligible = items.filter((it) => it.candidates.length > 0)
  if (eligible.length === 0) return result

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
  const payload = eligible.map((it) => ({
    index: it.index,
    item: it.itemName,
    candidates: it.candidates.map((c) => ({ id: c.id, name: c.name, unit: c.unit })),
  }))

  try {
    const content = await askOpenRouter(
      [
        { role: 'system', content: ARBITER_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      model
    )
    if (!content) return result

    const parsed = parseJSON<{ index: number; chosen_id: string | null }[]>(content)
    const candidateIdsByIndex = new Map(eligible.map((it) => [it.index, new Set(it.candidates.map((c) => c.id))]))

    for (const row of Array.isArray(parsed) ? parsed : []) {
      const validIds = candidateIdsByIndex.get(row.index)
      if (!validIds) continue
      // Validasi ketat: id hasil AI harus benar-benar ada di daftar kandidat yang kita kirim.
      const chosen = row.chosen_id && validIds.has(row.chosen_id) ? row.chosen_id : null
      result.set(row.index, chosen)
    }
  } catch {
    // Gagal panggil AI (mis. tanpa API key, timeout, dsb) -> biarkan item tetap tanpa saran,
    // jangan sampai menggagalkan seluruh alur generate draft.
    return result
  }

  return result
}

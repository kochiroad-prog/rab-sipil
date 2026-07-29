import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDraftItems } from '@/lib/openrouter-vision'
import { buildAhspMatchIndex, findBestAhspMatch, findTopAhspMatches, type AhspMatchCandidate } from '@/lib/ahsp-match'
import { arbitrateAhspMatches, type ArbiterItem } from '@/lib/ahsp-arbiter'

const CONFIDENT_THRESHOLD = 0.6

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { images, job_name, answers, template_id } = await req.json()
  const imageDataUrls: string[] = Array.isArray(images) ? images : []

  try {
    let standardItems: string[] = []
    if (template_id) {
      const { data: tplItems } = await supabase
        .from('job_template_items')
        .select('name, unit')
        .eq('template_id', template_id)
        .order('sort_order')
      standardItems = (tplItems ?? []).map((i) => `${i.name} (${i.unit})`)
    }

    const { items } = await generateDraftItems(imageDataUrls, job_name ?? 'Pekerjaan', answers ?? {}, standardItems)

    // Cocokkan tiap item draft ke referensi AHSP (deterministik, bukan AI) supaya harga satuan
    // langsung tersaran alih-alih 0 — user tetap bisa ganti/koreksi di tabel review.
    const { data: ahspRaw } = await supabase
      .from('ahsp_items')
      .select('id, code, name, unit, unit_price, tkdn_percent, ahsp_categories(name)')
      .returns<
        { id: string; code: string | null; name: string; unit: string; unit_price: number; tkdn_percent: number; ahsp_categories: { name: string } | null }[]
      >()

    const candidates: AhspMatchCandidate[] = (ahspRaw ?? []).map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      unit: a.unit,
      unit_price: a.unit_price,
      tkdn_percent: a.tkdn_percent,
      category_name: a.ahsp_categories?.name ?? null,
    }))

    const matchIndex = buildAhspMatchIndex(candidates)
    // Layer 1 (deterministik): skor kemiripan token berbobot TF-IDF + kamus sinonim sipil.
    const ruleMatches = items.map((it) => findBestAhspMatch(it.name, candidates, matchIndex, 0))

    // Layer 2 (AI, opsional): HANYA untuk item yang skor Layer 1-nya rendah/tidak ada.
    // AI cuma boleh memilih dari daftar kandidat teratas hasil Rule Engine — tidak bisa mengarang.
    const uncertainIdx = ruleMatches
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !m || m.score < CONFIDENT_THRESHOLD)
      .map(({ i }) => i)

    const arbiterItems: ArbiterItem[] = uncertainIdx.map((i) => ({
      index: i,
      itemName: items[i].name,
      candidates: findTopAhspMatches(items[i].name, candidates, matchIndex, 6),
    }))
    const aiChoices = arbiterItems.length > 0 ? await arbitrateAhspMatches(arbiterItems) : new Map<number, string | null>()

    const pricedItems = items.map((it, i) => {
      const rule = ruleMatches[i]
      if (rule && rule.score >= CONFIDENT_THRESHOLD) {
        return {
          ...it,
          ahsp_item_id: rule.id,
          ahsp_item_name: rule.name,
          unit_price: rule.unit_price,
          tkdn_percent: rule.tkdn_percent,
          match_score: rule.score,
          matched_via: 'rule' as const,
        }
      }

      const chosenId = aiChoices.get(i)
      if (chosenId) {
        const chosen = candidates.find((c) => c.id === chosenId)
        if (chosen) {
          return {
            ...it,
            ahsp_item_id: chosen.id,
            ahsp_item_name: chosen.name,
            unit_price: chosen.unit_price,
            tkdn_percent: chosen.tkdn_percent,
            match_score: rule?.score ?? 0,
            matched_via: 'ai' as const,
          }
        }
      }

      return {
        ...it,
        ahsp_item_id: null,
        ahsp_item_name: null,
        unit_price: 0,
        tkdn_percent: 0,
        match_score: 0,
        matched_via: 'none' as const,
      }
    })

    return NextResponse.json({ items: pricedItems })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

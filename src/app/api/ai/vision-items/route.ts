import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDraftItems } from '@/lib/openrouter-vision'
import { buildAhspMatchIndex, findBestAhspMatch, type AhspMatchCandidate } from '@/lib/ahsp-match'

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
    const pricedItems = items.map((it) => {
      const match = findBestAhspMatch(it.name, candidates, matchIndex)
      return {
        ...it,
        ahsp_item_id: match?.id ?? null,
        ahsp_item_name: match?.name ?? null,
        unit_price: match?.unit_price ?? 0,
        tkdn_percent: match?.tkdn_percent ?? 0,
        match_score: match?.score ?? 0,
      }
    })

    return NextResponse.json({ items: pricedItems })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

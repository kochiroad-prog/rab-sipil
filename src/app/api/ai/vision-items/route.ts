import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDraftItems } from '@/lib/openrouter-vision'

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
    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

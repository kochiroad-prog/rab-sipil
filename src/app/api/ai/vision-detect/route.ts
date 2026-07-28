import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectJob, matchTemplate } from '@/lib/openrouter-vision'
import type { JobTemplate, JobTemplateQuestion } from '@/types/database'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { images, hints } = await req.json()
  const imageDataUrls: string[] = Array.isArray(images) ? images : []

  try {
    const { detection } = await detectJob(imageDataUrls, hints ?? '')

    const { data: templates } = await supabase
      .from('job_templates')
      .select('*, job_template_questions(*)')
      .eq('is_active', true)
      .returns<(JobTemplate & { job_template_questions: JobTemplateQuestion[] })[]>()

    const matched = matchTemplate(detection.job_name, templates ?? [])

    let questions = detection.questions
    let template_id: string | null = null
    let template_name: string | null = null

    if (matched) {
      template_id = matched.id
      template_name = matched.name
      const tplQs = [...matched.job_template_questions]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((q) => ({
          key: q.key,
          label: q.label,
          type: q.qtype,
          options: q.options,
          unit: q.unit ?? undefined,
          allowCustom: q.allow_custom,
        }))
      const keys = new Set(tplQs.map((q) => q.key.toLowerCase()))
      const extra = detection.questions.filter((q) => !keys.has((q.key || '').toLowerCase()))
      questions = [...tplQs, ...extra]
    }

    return NextResponse.json({
      job_name: detection.job_name,
      confidence: detection.confidence,
      notes: detection.notes,
      questions,
      template_id,
      template_name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

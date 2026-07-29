import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('ai_estimations')
    .insert({
      owner_id: user.id,
      project_id: body.project_id || null,
      image_urls: Array.isArray(body.image_urls) ? body.image_urls : [],
      job_name: body.job_name ?? null,
      hints: body.hints ?? null,
      template_id: body.template_id ?? null,
      template_name: body.template_name ?? null,
      confidence: body.confidence ?? null,
      notes: body.notes ?? null,
      questions: body.questions ?? [],
      status: 'questions',
      model: body.model ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.answers) patch.answers = body.answers
  if (body.status) patch.status = body.status
  if (typeof body.items_count === 'number') patch.items_count = body.items_count
  if (body.project_id) patch.project_id = body.project_id

  const { error } = await supabase.from('ai_estimations').update(patch).eq('id', id).eq('owner_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

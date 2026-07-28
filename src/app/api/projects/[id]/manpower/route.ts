import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateManpowerPlan } from '@/lib/openrouter-manpower'
import type { WorkActivity } from '@/types/database'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects').select('id').eq('id', id).single()
  if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })

  const { data: rabItems } = await supabase
    .from('rab_items')
    .select('name, unit, volume')
    .eq('project_id', id)
    .returns<{ name: string; unit: string; volume: number }[]>()

  if (!rabItems || rabItems.length === 0) {
    return NextResponse.json({ error: 'Belum ada item RAB di proyek ini.' }, { status: 400 })
  }

  const { data: activities } = await supabase
    .from('work_activities')
    .select('kategori_pekerjaan, activity_name, skill_kategori, unit, productivity_rate')
    .returns<WorkActivity[]>()

  try {
    const { result, model } = await generateManpowerPlan(rabItems, activities ?? [])

    const { data: saved, error } = await supabase
      .from('manpower_plans')
      .insert({ project_id: id, ai_result: result, model })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ plan_id: saved.id, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRabWorkbook, type AhspDetail } from '@/lib/export-excel'
import type { Project, RabItem, AhspItem, AhspComponent } from '@/types/database'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })

  const { data: items } = await supabase
    .from('rab_items')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<RabItem[]>()

  const rabItems = items ?? []

  const ahspItemIds = Array.from(
    new Set(rabItems.map((it) => it.ahsp_item_id).filter((v): v is string => !!v))
  )

  let ahspDetails: AhspDetail[] = []
  if (ahspItemIds.length > 0) {
    const [{ data: ahspItems }, { data: components }] = await Promise.all([
      supabase.from('ahsp_items').select('*').in('id', ahspItemIds).returns<AhspItem[]>(),
      supabase.from('ahsp_components').select('*').in('ahsp_item_id', ahspItemIds).returns<AhspComponent[]>(),
    ])
    ahspDetails = (ahspItems ?? []).map((item) => ({
      item,
      components: (components ?? []).filter((c) => c.ahsp_item_id === item.id),
    }))
  }

  const wb = buildRabWorkbook(project, rabItems, ahspDetails)
  const buffer = await wb.xlsx.writeBuffer()
  const filename = `RAB_${project.name.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

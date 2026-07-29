import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPurchasingWorkbook } from '@/lib/export-purchasing'
import { aggregateMaterials } from '@/lib/takeoff-sipil'
import type { Project, RabItem, AhspComponent, Material } from '@/types/database'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 })

  const { data: rabItems } = await supabase
    .from('rab_items')
    .select('*')
    .eq('project_id', id)
    .returns<RabItem[]>()

  const ahspItemIds = Array.from(
    new Set((rabItems ?? []).map((it) => it.ahsp_item_id).filter((v): v is string => !!v))
  )

  let componentsByAhspItem = new Map<string, AhspComponent[]>()
  if (ahspItemIds.length > 0) {
    const { data: components } = await supabase
      .from('ahsp_components')
      .select('*')
      .in('ahsp_item_id', ahspItemIds)
      .eq('component_type', 'material')
      .returns<AhspComponent[]>()

    componentsByAhspItem = new Map()
    for (const c of components ?? []) {
      const arr = componentsByAhspItem.get(c.ahsp_item_id) ?? []
      arr.push(c)
      componentsByAhspItem.set(c.ahsp_item_id, arr)
    }
  }

  const { data: materials } = await supabase.from('materials').select('*').returns<Material[]>()

  const rows = aggregateMaterials(rabItems ?? [], componentsByAhspItem, materials ?? [])

  const wb = buildPurchasingWorkbook(project, rows)
  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Purchasing_${project.name.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRabWorkbook } from '@/lib/export-excel'
import type { Project, RabItem } from '@/types/database'

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

  const wb = buildRabWorkbook(project, items ?? [])
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

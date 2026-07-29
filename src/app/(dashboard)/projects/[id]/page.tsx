import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, RabItem } from '@/types/database'
import AiAssist from '@/components/AiAssist'
import VisionEstimator from '@/components/VisionEstimator'
import ProjectSettings from '@/components/ProjectSettings'
import AddRabItemForm from '@/components/AddRabItemForm'
import RabItemsTable from '@/components/RabItemsTable'
import type { AhspOption } from '@/components/AhspCombobox'
import { deleteProject } from '../actions'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single<Project>()

  if (!project) notFound()

  const { data: items } = await supabase
    .from('rab_items')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<RabItem[]>()

  const { data: ahspItemsRaw } = await supabase
    .from('ahsp_items')
    .select('id, code, name, unit, unit_price, tkdn_percent, ahsp_categories(name)')
    .order('name', { ascending: true })
    .returns<
      { id: string; code: string | null; name: string; unit: string; unit_price: number; tkdn_percent: number; ahsp_categories: { name: string } | null }[]
    >()

  const ahspItems: AhspOption[] = (ahspItemsRaw ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    unit: a.unit,
    unit_price: a.unit_price,
    tkdn_percent: a.tkdn_percent,
    category_name: a.ahsp_categories?.name ?? null,
  }))

  const rabItems = items ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {project.client_name ?? 'Tanpa klien'} · {project.location ?? 'Tanpa lokasi'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${project.id}/volume`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Backup Volume
          </Link>
          <Link
            href={`/projects/${project.id}/from-template`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Terapkan Template
          </Link>
          <Link
            href={`/projects/${project.id}/manpower`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Rencana Tenaga Kerja
          </Link>
          <Link
            href={`/projects/${project.id}/purchasing`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Purchasing
          </Link>
          <Link
            href={`/projects/${project.id}/quotation`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Surat Penawaran
          </Link>
          <Link
            href={`/projects/${project.id}/warehouse`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Gudang Proyek
          </Link>
          <a
            href={`/api/projects/${project.id}/export`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Export Excel
          </a>
          <form action={deleteProject}>
            <input type="hidden" name="id" value={project.id} />
            <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
              Hapus Proyek
            </button>
          </form>
        </div>
      </div>

      <ProjectSettings
        projectId={project.id}
        ppnPercent={project.ppn_percent}
        overheadPercent={project.overhead_percent}
        tahunAnggaran={project.tahun_anggaran}
      />

      <VisionEstimator projectId={project.id} ahspItems={ahspItems} />

      <AiAssist />

      <AddRabItemForm projectId={project.id} ahspItems={ahspItems} />

      <RabItemsTable projectId={project.id} items={rabItems} ppnPercent={project.ppn_percent} />
    </div>
  )
}

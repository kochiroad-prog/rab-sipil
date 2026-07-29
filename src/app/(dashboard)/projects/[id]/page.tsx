import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, RabItem } from '@/types/database'
import AiAssist from '@/components/AiAssist'
import VisionEstimator from '@/components/VisionEstimator'
import RabItemPriceEditor from '@/components/RabItemPriceEditor'
import ProjectSettings from '@/components/ProjectSettings'
import AddRabItemForm from '@/components/AddRabItemForm'
import type { AhspOption } from '@/components/AhspCombobox'
import { deleteRabItem, deleteProject } from '../actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

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
  const subtotal = rabItems.reduce((sum, it) => sum + it.volume * it.unit_price, 0)
  const ppn = (subtotal * project.ppn_percent) / 100
  const total = subtotal + ppn
  const totalNilaiTkdn = rabItems.reduce((sum, it) => sum + it.volume * it.unit_price * (it.tkdn_percent / 100), 0)
  const tkdnProjectPercent = subtotal > 0 ? (totalNilaiTkdn / subtotal) * 100 : 0

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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Uraian Pekerjaan</th>
              <th className="px-4 py-3 font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Volume</th>
              <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Jumlah</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rabItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Belum ada item RAB.
                </td>
              </tr>
            )}
            {rabItems.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-slate-500">{it.section ?? '-'}</td>
                <td className="px-4 py-3 text-slate-900">{it.name}</td>
                <td className="px-4 py-3 text-slate-600">{it.unit}</td>
                <td className="px-4 py-3 text-right text-slate-600">{it.volume}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  <RabItemPriceEditor
                    id={it.id}
                    projectId={project.id}
                    unitPrice={it.unit_price}
                    tkdnPercent={it.tkdn_percent}
                  />
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatRupiah(it.volume * it.unit_price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteRabItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="project_id" value={project.id} />
                    <button className="text-xs text-red-600 hover:underline">Hapus</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 text-sm">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-slate-500">Subtotal</td>
              <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(subtotal)}</td>
              <td />
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-slate-500">PPN ({project.ppn_percent}%)</td>
              <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(ppn)}</td>
              <td />
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right font-semibold text-slate-900">Total RAB</td>
              <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">{formatRupiah(total)}</td>
              <td />
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-emerald-700">Nilai TKDN Proyek</td>
              <td className="px-4 py-2 text-right font-medium text-emerald-700">{tkdnProjectPercent.toFixed(1)}%</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

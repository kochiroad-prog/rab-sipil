import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, RabItem, AhspItem, AhspCategory } from '@/types/database'
import AiAssist from '@/components/AiAssist'
import RabItemPriceEditor from '@/components/RabItemPriceEditor'
import ProjectSettings from '@/components/ProjectSettings'
import { addRabItem, deleteRabItem, deleteProject } from '../actions'

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

  const { data: ahspItems } = await supabase
    .from('ahsp_items')
    .select('*, ahsp_categories(name)')
    .order('name', { ascending: true })
    .returns<(AhspItem & { ahsp_categories: AhspCategory | null })[]>()

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

      <AiAssist />

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Tambah Item Manual</h3>
        <form action={addRabItem} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input type="hidden" name="project_id" value={project.id} />
          <input
            name="section"
            placeholder="Kategori (opsional)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <select
            name="ahsp_item_id"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            defaultValue=""
          >
            <option value="">-- Referensi AHSP (opsional) --</option>
            {(ahspItems ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.ahsp_categories?.name ? `[${a.ahsp_categories.name}] ` : ''}
                {a.name} ({a.unit}) - {formatRupiah(a.unit_price)}
              </option>
            ))}
          </select>
          <input
            name="name"
            required
            placeholder="Nama pekerjaan"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="unit"
            required
            placeholder="Satuan"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="volume"
            type="number"
            step="0.01"
            required
            placeholder="Volume"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="unit_price"
            type="number"
            step="1"
            required
            placeholder="Harga satuan"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <input
            name="tkdn_percent"
            type="number"
            step="0.1"
            min={0}
            max={100}
            placeholder="TKDN % (opsional)"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
          />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Pilih referensi AHSP untuk mengisi nama &amp; TKDN otomatis (kalau TKDN dikosongkan) — harga tetap perlu diisi.
          Klik nilai harga di tabel untuk edit belakangan.
        </p>
      </div>

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

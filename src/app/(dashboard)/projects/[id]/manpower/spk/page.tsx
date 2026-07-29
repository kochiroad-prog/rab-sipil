import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ManpowerSpk, Project } from '@/types/database'
import { createSpk, deleteSpk } from './actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  agreed: 'Disepakati',
  in_progress: 'Berjalan',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  agreed: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  done: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-50 text-red-700',
}

export default async function SpkListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: spksRaw } = await supabase
    .from('manpower_spk')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .returns<ManpowerSpk[]>()
  const spks = spksRaw ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}/manpower`} className="text-sm text-slate-500 hover:underline">
          &larr; Kembali ke Rencana Tenaga Kerja
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">SPK &amp; Upah Kerja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Surat Perintah Kerja — komitmen resmi ke tukang/mandor borongan, dengan termin, klausul, dan tanda tangan digital.
        </p>
      </div>

      <form action={createSpk} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Buat SPK Baru</h3>
        <input type="hidden" name="project_id" value={id} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input name="worker_name" required placeholder="Nama pemborong/tukang" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="worker_phone" placeholder="No. HP" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="client_name" defaultValue={project.client_name ?? ''} placeholder="Nama klien/proyek" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />

          <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
            Tgl SPK
            <input name="spk_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
            Mulai
            <input name="start_date" type="date" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
            Selesai (target)
            <input name="end_date" type="date" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Buat &amp; Edit
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">No. SPK</th>
              <th className="px-4 py-3 font-medium">Pemborong</th>
              <th className="px-4 py-3 text-right font-medium">Nilai</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {spks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada SPK.</td>
              </tr>
            )}
            {spks.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-slate-900">
                  <Link href={`/projects/${id}/manpower/spk/${s.id}`} className="hover:underline">
                    {s.spk_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{s.worker_name ?? '-'}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(s.grand_total)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/projects/${id}/manpower/spk/${s.id}`} className="mr-3 text-xs text-blue-700 hover:underline">
                    Edit
                  </Link>
                  <form action={deleteSpk} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="project_id" value={id} />
                    <button className="text-xs text-red-600 hover:underline">Hapus</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

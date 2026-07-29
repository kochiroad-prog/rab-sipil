import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, Quotation } from '@/types/database'
import { addQuotation, deleteQuotation } from './actions'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  terkirim: 'Terkirim',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  terkirim: 'bg-blue-50 text-blue-700',
  diterima: 'bg-emerald-50 text-emerald-700',
  ditolak: 'bg-red-50 text-red-700',
}

export default async function ProjectQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: quotationsRaw } = await supabase
    .from('quotations')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .returns<Quotation[]>()
  const quotations = quotationsRaw ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-blue-700 hover:underline">
          &larr; Kembali ke Proyek
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Surat Penawaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          Proyek: {project.name}. Nilai penawaran diambil otomatis dari Rincian RAB terkini.{' '}
          <Link href="/settings/company" className="text-blue-700 hover:underline">
            Atur Profil Perusahaan (kop surat)
          </Link>
        </p>
      </div>

      <form action={addQuotation} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Buat Surat Penawaran Baru</h3>
        <input type="hidden" name="project_id" value={id} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input name="quote_number" placeholder="No. Surat (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
            Tgl Surat
            <input name="quote_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
            Berlaku Sampai
            <input name="valid_until" type="date" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <input name="discount_percent" type="number" step="0.1" placeholder="Diskon % (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />

          <input name="client_name" defaultValue={project.client_name ?? ''} placeholder="Nama klien/instansi" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="client_contact" placeholder="Kontak klien (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="client_address" placeholder="Alamat klien (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-4" />

          <textarea name="greeting" placeholder="Kalimat pembuka (opsional, akan diisi default jika kosong)" rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-4" />
          <textarea name="closing_notes" placeholder="Syarat &amp; ketentuan / catatan penutup (opsional)" rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-4" />

          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Buat &amp; Lihat
          </button>
        </div>
      </form>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Riwayat Surat Penawaran</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">No. Surat</th>
                <th className="px-4 py-3 font-medium">Tgl</th>
                <th className="px-4 py-3 font-medium">Klien</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada surat penawaran.</td>
                </tr>
              )}
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 text-slate-900">
                    <Link href={`/projects/${id}/quotation/${q.id}`} className="hover:underline">
                      {q.quote_number || '(tanpa nomor)'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{q.quote_date}</td>
                  <td className="px-4 py-3 text-slate-600">{q.client_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[q.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/projects/${id}/quotation/${q.id}`} className="mr-3 text-xs text-blue-700 hover:underline">
                      Lihat/Cetak
                    </Link>
                    <form action={deleteQuotation} className="inline">
                      <input type="hidden" name="id" value={q.id} />
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
    </div>
  )
}

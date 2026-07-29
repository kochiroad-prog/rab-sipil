import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { LabourTermin, ManpowerSpk, Project } from '@/types/database'
import TerminPayForm from '@/components/TerminPayForm'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default async function UpahKerjaPage() {
  const supabase = await createClient()

  const { data: spksRaw } = await supabase
    .from('manpower_spk')
    .select('*')
    .in('status', ['agreed', 'in_progress', 'done'])
    .returns<ManpowerSpk[]>()
  const spks = spksRaw ?? []
  const spkIds = spks.map((s) => s.id)
  const spkById = new Map(spks.map((s) => [s.id, s]))

  let termins: LabourTermin[] = []
  if (spkIds.length > 0) {
    const { data: terminsRaw } = await supabase
      .from('labour_termins')
      .select('*')
      .in('spk_id', spkIds)
      .order('status', { ascending: true })
      .order('created_at', { ascending: true })
      .returns<LabourTermin[]>()
    termins = terminsRaw ?? []
  }

  const projectIds = Array.from(new Set(spks.map((s) => s.project_id)))
  let projectsById = new Map<string, Project>()
  if (projectIds.length > 0) {
    const { data: projectsRaw } = await supabase.from('projects').select('*').in('id', projectIds).returns<Project[]>()
    projectsById = new Map((projectsRaw ?? []).map((p) => [p.id, p]))
  }

  const pending = termins.filter((t) => t.status === 'pending')
  const paid = termins.filter((t) => t.status === 'paid')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upah Kerja</h1>
        <p className="mt-1 text-sm text-slate-500">
          Termin pembayaran dari SPK yang sudah disepakati, lintas proyek.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Menunggu Dibayar</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">SPK</th>
                <th className="px-4 py-3 font-medium">Proyek</th>
                <th className="px-4 py-3 font-medium">Pemborong</th>
                <th className="px-4 py-3 font-medium">Termin</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Tidak ada termin menunggu.</td>
                </tr>
              )}
              {pending.map((t) => {
                const spk = t.spk_id ? spkById.get(t.spk_id) : undefined
                const project = spk ? projectsById.get(spk.project_id) : undefined
                return (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-slate-900">
                      {spk && project ? (
                        <Link href={`/projects/${project.id}/manpower/spk/${spk.id}`} className="hover:underline">
                          {spk.spk_number}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{project?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.worker_name ?? spk?.worker_name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.description}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(t.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <TerminPayForm terminId={t.id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Riwayat Dibayar</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Pemborong</th>
                <th className="px-4 py-3 font-medium">Termin</th>
                <th className="px-4 py-3 text-right font-medium">Jumlah</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paid.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada riwayat.</td>
                </tr>
              )}
              {paid.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-slate-500">{t.paid_at ? new Date(t.paid_at).toLocaleDateString('id-ID') : '-'}</td>
                  <td className="px-4 py-3 text-slate-900">{t.worker_name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{t.description}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(t.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {t.proof_url ? (
                      <a href={t.proof_url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline">Lihat Bukti</a>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
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

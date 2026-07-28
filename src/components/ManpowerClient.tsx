'use client'

import { useMemo, useState } from 'react'
import type { ManpowerAIResult } from '@/types/database'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function rescale(result: ManpowerAIResult, newDeadlineDays: number): ManpowerAIResult {
  if (newDeadlineDays <= 0 || result.summary_days <= 0) return result
  const scale = result.summary_days / newDeadlineDays
  const team_plan = result.team_plan.map((row) => ({
    ...row,
    count: Math.max(1, Math.ceil(row.count * scale)),
    days: Math.max(1, Math.round(row.days / scale)),
  }))
  const summary_cost = team_plan.reduce((s, r) => s + r.count * r.days * r.daily_rate, 0)
  return { ...result, team_plan, summary_days: newDeadlineDays, summary_cost }
}

export default function ManpowerClient({ projectId, initial }: { projectId: string; initial: ManpowerAIResult | null }) {
  const [result, setResult] = useState<ManpowerAIResult | null>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<number | null>(initial?.summary_days ?? null)

  const displayed = useMemo(() => {
    if (!result) return null
    if (!deadline || deadline === result.summary_days) return result
    return rescale(result, deadline)
  }, [result, deadline])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/manpower`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal generate rencana tim')
      setResult(data.result)
      setDeadline(data.result.summary_days)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          AI menganalisa item RAB proyek ini, susun rencana tim (skill/jumlah/hari/biaya), dan bandingkan skema harian vs borongan.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Menyusun rencana...' : result ? 'Generate Ulang' : 'Generate Rencana Tim'}
        </button>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {displayed && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-medium text-slate-900">Simulator Deadline</h3>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min={Math.max(1, Math.round((result?.summary_days ?? 1) / 3))}
                max={(result?.summary_days ?? 1) * 2}
                value={deadline ?? result?.summary_days ?? 1}
                onChange={(e) => setDeadline(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-32 text-sm text-slate-700">{deadline ?? result?.summary_days} hari</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Geser untuk simulasi percepat/perlambat durasi — dihitung ulang langsung tanpa panggilan AI baru.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 text-right font-medium">Jumlah Orang</th>
                  <th className="px-4 py-3 text-right font-medium">Hari</th>
                  <th className="px-4 py-3 text-right font-medium">Upah Harian</th>
                  <th className="px-4 py-3 text-right font-medium">Total Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.team_plan.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-slate-900">{row.skill}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.count}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.days}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(row.daily_rate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatRupiah(row.count * row.days * row.daily_rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-900">Total Estimasi Biaya Tenaga Kerja</td>
                  <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">
                    {formatRupiah(displayed.team_plan.reduce((s, r) => s + r.count * r.days * r.daily_rate, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-medium text-slate-900">Borongan vs Harian</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Skema Harian</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {formatRupiah(result?.borongan_comparison.harian_total ?? 0)}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Estimasi Skema Borongan</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {formatRupiah(result?.borongan_comparison.borongan_estimate_total ?? 0)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              Rekomendasi:{' '}
              <span className="font-medium text-emerald-700">{result?.borongan_comparison.recommendation}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">{result?.borongan_comparison.reasoning}</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Item RAB</th>
                  <th className="px-4 py-3 font-medium">Aktivitas</th>
                  <th className="px-4 py-3 font-medium">Skill</th>
                  <th className="px-4 py-3 text-right font-medium">Volume</th>
                  <th className="px-4 py-3 text-right font-medium">Produktivitas</th>
                  <th className="px-4 py-3 text-right font-medium">Estimasi Hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result?.work_items.map((wi, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-slate-900">{wi.rab_item_name}</td>
                    <td className="px-4 py-3 text-slate-600">{wi.activity}</td>
                    <td className="px-4 py-3 text-slate-600">{wi.skill}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{wi.volume} {wi.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{wi.productivity_rate}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{wi.estimated_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

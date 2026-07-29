'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Equipment } from '@/types/database'
import { deleteEquipment } from '@/app/(dashboard)/equipment/actions'
import { computeServiceStatus, SERVICE_STATUS_BADGE, SERVICE_STATUS_LABEL } from '@/lib/equipment-service-status'

const CATEGORY_LABEL: Record<string, string> = {
  alat_berat: 'Alat Berat',
  alat_tangan: 'Alat Tangan',
  alat_ukur: 'Alat Ukur',
  scaffolding: 'Scaffolding/Perancah',
  genset: 'Genset',
  alat_listrik: 'Alat Listrik',
  lainnya: 'Lainnya',
}

const CONDITION_BADGE: Record<string, string> = {
  baik: 'bg-emerald-50 text-emerald-700',
  rusak_ringan: 'bg-amber-50 text-amber-700',
  rusak_berat: 'bg-red-50 text-red-700',
  perbaikan: 'bg-slate-100 text-slate-600',
}

const CONDITION_LABEL: Record<string, string> = {
  baik: 'Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  perbaikan: 'Perbaikan',
}

export type ActiveLoanInfo = { borrower_name: string; loan_date: string; expected_return_date: string | null }

export default function EquipmentBrowser({
  equipment,
  activeLoans,
}: {
  equipment: Equipment[]
  activeLoans: Record<string, ActiveLoanInfo>
}) {
  const [query, setQuery] = useState('')
  const [onlyNeedsService, setOnlyNeedsService] = useState(false)

  const withStatus = useMemo(
    () => equipment.map((e) => ({ e, service: computeServiceStatus(e.next_service_date) })),
    [equipment]
  )

  const summary = useMemo(() => {
    const terlambat = withStatus.filter((x) => x.service.status === 'terlambat').length
    const segera = withStatus.filter((x) => x.service.status === 'segera').length
    return { terlambat, segera }
  }, [withStatus])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return withStatus.filter(({ e, service }) => {
      const matchQuery = !q || `${e.code ?? ''} ${e.name} ${e.brand ?? ''} ${e.model ?? ''}`.toLowerCase().includes(q)
      const matchService = !onlyNeedsService || service.status === 'terlambat' || service.status === 'segera'
      return matchQuery && matchService
    })
  }, [withStatus, query, onlyNeedsService])

  return (
    <>
      {(summary.terlambat > 0 || summary.segera > 0) && (
        <p className="mb-2 text-xs text-amber-700">
          {summary.terlambat > 0 && `${summary.terlambat} alat terlambat servis`}
          {summary.terlambat > 0 && summary.segera > 0 && ' · '}
          {summary.segera > 0 && `${summary.segera} alat segera servis`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, kode, atau merek..."
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={onlyNeedsService} onChange={(e) => setOnlyNeedsService(e.target.checked)} />
          Perlu Servis
        </label>
        <span className="text-xs text-slate-400">{filtered.length} dari {equipment.length} alat</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Alat</th>
              <th className="px-4 py-3 font-medium">Kondisi</th>
              <th className="px-4 py-3 font-medium">Servis</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {equipment.length === 0 ? 'Belum ada alat.' : 'Tidak ada yang cocok.'}
                </td>
              </tr>
            )}
            {filtered.map(({ e, service }) => {
              const loan = activeLoans[e.id]
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-500">{CATEGORY_LABEL[e.category] ?? e.category}</td>
                  <td className="px-4 py-3 text-slate-900">
                    <div className="flex items-start gap-2">
                      {e.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.image_url} alt={e.name} className="h-8 w-8 shrink-0 rounded object-cover" />
                      ) : null}
                      <div>
                        <Link href={`/equipment/${e.id}`} className="hover:underline">
                          {e.name}
                        </Link>
                        {e.code ? <span className="ml-1 text-xs text-slate-400">[{e.code}]</span> : null}
                        {(e.brand || e.model) && (
                          <p className="text-xs text-slate-400">{[e.brand, e.model].filter(Boolean).join(' ')}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${CONDITION_BADGE[e.condition] ?? 'bg-slate-100 text-slate-600'}`}>
                      {CONDITION_LABEL[e.condition] ?? e.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${SERVICE_STATUS_BADGE[service.status]}`}>
                      {SERVICE_STATUS_LABEL[service.status]}
                      {service.status === 'terlambat' && service.daysDiff !== null ? ` (${Math.abs(service.daysDiff)} hari)` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {loan ? (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                        Dipinjam: {loan.borrower_name}
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Tersedia</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/equipment/${e.id}`} className="mr-3 text-xs text-blue-700 hover:underline">
                      Detail
                    </Link>
                    <form action={deleteEquipment} className="inline">
                      <input type="hidden" name="id" value={e.id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

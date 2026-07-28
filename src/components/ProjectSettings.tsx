'use client'

import { useState } from 'react'
import { updateProjectSettings } from '@/app/(dashboard)/projects/actions'

export default function ProjectSettings({
  projectId,
  ppnPercent,
  overheadPercent,
  tahunAnggaran,
}: {
  projectId: string
  ppnPercent: number
  overheadPercent: number
  tahunAnggaran: number | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-slate-900"
      >
        <span>
          Pengaturan Proyek — PPN {ppnPercent}% · Overhead &amp; Profit {overheadPercent}%
          {tahunAnggaran ? ` · TA ${tahunAnggaran}` : ''}
        </span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <form action={updateProjectSettings} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" value={projectId} />
          <div>
            <label className="block text-xs font-medium text-slate-600">PPN (%)</label>
            <input
              name="ppn_percent"
              type="number"
              step="0.1"
              defaultValue={ppnPercent}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Overhead &amp; Profit (%)</label>
            <input
              name="overhead_percent"
              type="number"
              step="0.1"
              defaultValue={overheadPercent}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Tahun Anggaran</label>
            <input
              name="tahun_anggaran"
              type="number"
              defaultValue={tahunAnggaran ?? undefined}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Simpan
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

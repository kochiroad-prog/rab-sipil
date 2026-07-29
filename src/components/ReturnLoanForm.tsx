'use client'

import { useState } from 'react'
import { returnLoan } from '@/app/(dashboard)/equipment/actions'
import SignaturePad from '@/components/SignaturePad'

const CONDITIONS = [
  ['baik', 'Baik'],
  ['rusak_ringan', 'Rusak Ringan'],
  ['rusak_berat', 'Rusak Berat'],
  ['perbaikan', 'Dalam Perbaikan'],
] as const

export default function ReturnLoanForm({ loanId, equipmentId }: { loanId: string; equipmentId: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-emerald-700 hover:underline">
        Kembalikan
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <form action={returnLoan} className="space-y-3">
        <input type="hidden" name="id" value={loanId} />
        <input type="hidden" name="equipment_id" value={equipmentId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
            Tgl kembali
            <input name="actual_return_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <select name="condition_in" defaultValue="baik" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1">
            {CONDITIONS.map(([v, l]) => (
              <option key={v} value={v}>Kondisi saat kembali: {l}</option>
            ))}
          </select>
          <select name="status" defaultValue="dikembalikan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1">
            <option value="dikembalikan">Dikembalikan</option>
            <option value="hilang">Hilang</option>
            <option value="rusak">Rusak</option>
          </select>
          <input name="notes" placeholder="Catatan (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Tanda tangan peminjam (serah terima)</p>
          <SignaturePad name="signature_data_url" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Simpan &amp; Cetak Tanda Terima
          </button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}

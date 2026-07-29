'use client'

import { addEquipment } from '@/app/(dashboard)/equipment/actions'

const CATEGORIES = [
  ['alat_berat', 'Alat Berat'],
  ['alat_tangan', 'Alat Tangan'],
  ['alat_ukur', 'Alat Ukur'],
  ['scaffolding', 'Scaffolding/Perancah'],
  ['genset', 'Genset'],
  ['alat_listrik', 'Alat Listrik'],
  ['lainnya', 'Lainnya'],
] as const

const CONDITIONS = [
  ['baik', 'Baik'],
  ['rusak_ringan', 'Rusak Ringan'],
  ['rusak_berat', 'Rusak Berat'],
  ['perbaikan', 'Dalam Perbaikan'],
] as const

export default function EquipmentForm() {
  return (
    <form action={addEquipment} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Tambah Alat</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <select name="category" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" defaultValue="lainnya">
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="code" placeholder="Kode inventaris (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <select name="condition" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" defaultValue="baik">
          {CONDITIONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <input name="name" required placeholder="Nama alat" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
        <input name="brand" placeholder="Merek" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="model" placeholder="Model" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />

        <input name="serial_number" placeholder="No. seri (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="location" placeholder="Lokasi penyimpanan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="purchase_price" type="number" step="1" placeholder="Harga beli (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

        <label className="flex flex-col text-xs text-slate-500 sm:col-span-2">
          Tgl beli
          <input name="purchase_date" type="date" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col text-xs text-slate-500 sm:col-span-2">
          Servis berikutnya (opsional, terisi otomatis stlh &quot;Catat Servis&quot;)
          <input name="next_service_date" type="date" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col text-xs text-slate-500 sm:col-span-2">
          Interval servis rutin (bulan)
          <input name="service_interval_months" type="number" step="1" min="0" placeholder="mis. 6" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <input name="notes" placeholder="Catatan (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
          Tambah
        </button>
      </div>
    </form>
  )
}

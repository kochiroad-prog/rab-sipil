'use client'

import { useState } from 'react'
import { addMaterial } from '@/app/(dashboard)/materials/actions'
import type { MaterialKind } from '@/types/database'

const CATEGORIES = [
  ['semen', 'Semen'],
  ['pasir', 'Pasir'],
  ['kerikil', 'Kerikil/Split'],
  ['besi', 'Besi'],
  ['kayu', 'Kayu'],
  ['bata', 'Bata/Batako'],
  ['keramik', 'Keramik/Ubin'],
  ['cat', 'Cat'],
  ['cat_finishing', 'Finishing Lain'],
  ['pipa', 'Pipa'],
  ['kabel', 'Kabel'],
  ['lainnya', 'Lainnya'],
] as const

const KIND_LABEL: Record<MaterialKind, string> = {
  linear: 'Batangan (linear) — mis. besi, kaso',
  sheet: 'Lembaran — mis. multiplek bekisting',
  coverage: 'Daya sebar — mis. cat',
  count: 'Hitung per m² — mis. bata, keramik',
  bulk: 'Curah/satuan langsung — mis. semen sak, pasir m³',
}

export default function MaterialForm() {
  const [kind, setKind] = useState<MaterialKind>('bulk')

  return (
    <form action={addMaterial} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Tambah Material</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
        <select name="category" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" defaultValue="lainnya">
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as MaterialKind)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        >
          {Object.entries(KIND_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="code" placeholder="Kode (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

        <input name="name" required placeholder="Nama material" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
        <input name="unit" required placeholder="Satuan biaya (kg/m3/sak/batang/m2)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <input name="price" type="number" step="1" required placeholder="Harga" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <input name="waste_pct" type="number" step="0.1" placeholder="Waste %" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <input name="tkdn_percent" type="number" step="0.1" min={0} max={100} placeholder="TKDN %" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />

        {kind === 'linear' && (
          <>
            <input name="length_mm" type="number" step="1" placeholder="Panjang batang standar (mm), mis 12000" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <input name="diameter_mm" type="number" step="0.1" placeholder="Diameter (mm, opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          </>
        )}
        {kind === 'sheet' && (
          <>
            <input name="sheet_width_mm" type="number" step="1" placeholder="Lebar lembar (mm)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <input name="sheet_height_mm" type="number" step="1" placeholder="Panjang lembar (mm)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          </>
        )}
        {kind === 'coverage' && (
          <input name="coverage_per_unit" type="number" step="0.01" placeholder="Daya sebar (m² per satuan)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        )}
        {kind === 'count' && (
          <input name="consumption_per_m2" type="number" step="0.1" placeholder="Kebutuhan per m² (mis. 70 buah/m²)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        )}

        <input name="brand" placeholder="Merek (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="specification" placeholder="Spesifikasi (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="aliases" placeholder="Alias, pisah koma (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
          Tambah
        </button>
      </div>
    </form>
  )
}

'use client'

import { useMemo, useState } from 'react'
import type { Material } from '@/types/database'
import MaterialPriceEditor from '@/components/MaterialPriceEditor'
import { deleteMaterial } from '@/app/(dashboard)/materials/actions'

const CATEGORY_LABEL: Record<string, string> = {
  semen: 'Semen',
  pasir: 'Pasir',
  kerikil: 'Kerikil/Split',
  besi: 'Besi',
  kayu: 'Kayu',
  bata: 'Bata/Batako',
  keramik: 'Keramik/Ubin',
  cat: 'Cat',
  cat_finishing: 'Finishing Lain',
  pipa: 'Pipa',
  kabel: 'Kabel',
  lainnya: 'Lainnya',
}

type MaterialRow = Material & { suppliers: { name: string } | null }

export default function MaterialsBrowser({ materials, userId }: { materials: MaterialRow[]; userId?: string }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return materials
    return materials.filter((m) =>
      `${m.code ?? ''} ${m.name} ${m.brand ?? ''} ${m.specification ?? ''}`.toLowerCase().includes(q)
    )
  }, [materials, query])

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, kode, atau merek..."
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-slate-400">{filtered.length} dari {materials.length} material</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-right font-medium">Waste</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {materials.length === 0 ? 'Belum ada material.' : 'Tidak ada yang cocok.'}
                </td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-slate-500">{CATEGORY_LABEL[m.category] ?? m.category}</td>
                <td className="px-4 py-3 text-slate-900">
                  {m.name}
                  {m.brand ? <span className="ml-1 text-xs text-slate-400">({m.brand})</span> : null}
                  {m.specification && <p className="text-xs text-slate-400">{m.specification}</p>}
                  {m.suppliers?.name && <p className="text-xs text-blue-600">Supplier: {m.suppliers.name}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  <MaterialPriceEditor id={m.id} price={m.price} />
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{m.waste_pct}%</td>
                <td className="px-4 py-3 text-right">
                  {m.owner_id === userId && (
                    <form action={deleteMaterial}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

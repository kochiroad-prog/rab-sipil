'use client'

import { useMemo, useState } from 'react'
import type { PurchaseRow } from '@/lib/takeoff-sipil'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function PurchasingTable({
  rows,
  stockByMaterialId = {},
}: {
  rows: PurchaseRow[]
  stockByMaterialId?: Record<string, number>
}) {
  const [query, setQuery] = useState('')
  const [onlyUnmatched, setOnlyUnmatched] = useState(false)

  const filtered = useMemo(() => {
    let list = rows
    if (onlyUnmatched) list = list.filter((r) => !r.matched)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((r) => `${r.materialName} ${r.category ?? ''}`.toLowerCase().includes(q))
    return list
  }, [rows, query, onlyUnmatched])

  const total = filtered.reduce((s, r) => s + r.subtotal, 0)

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari material atau kategori..."
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={onlyUnmatched} onChange={(e) => setOnlyUnmatched(e.target.checked)} />
          Hanya yang belum cocok
        </label>
        <span className="text-xs text-slate-400">{filtered.length} dari {rows.length} material</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Material</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 text-right font-medium">Kebutuhan</th>
              <th className="px-4 py-3 text-right font-medium">Qty Beli</th>
              <th className="px-4 py-3 text-right font-medium">Stok Gudang</th>
              <th className="px-4 py-3 text-right font-medium">Perlu Beli</th>
              <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada material yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((r) => {
              const stok = r.matchedId ? stockByMaterialId[r.matchedId] ?? 0 : 0
              const perluBeli = Math.max(0, r.purchaseQty - stok)
              return (
                <tr key={r.key}>
                  <td className="px-4 py-3">
                    <span className="text-slate-900">{r.materialName}</span>
                    {!r.matched && <span className="ml-2 text-xs text-amber-600">belum cocok</span>}
                    <p className="text-xs text-slate-400">{r.detail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.category ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.costQty} {r.costUnit}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{r.purchaseQty} {r.purchaseUnit}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{stok > 0 ? `${stok} ${r.purchaseUnit}` : '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{perluBeli} {r.purchaseUnit}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(r.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatRupiah(r.subtotal)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t border-slate-200 text-sm">
            <tr>
              <td colSpan={7} className="px-4 py-3 text-right font-semibold text-slate-900">
                Total Estimasi Belanja Bahan {query || onlyUnmatched ? '(hasil filter)' : ''}
              </td>
              <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">{formatRupiah(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

'use client'

import { useMemo, useState } from 'react'
import type { RabItem } from '@/types/database'
import RabItemPriceEditor from '@/components/RabItemPriceEditor'
import { deleteRabItem } from '@/app/(dashboard)/projects/actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const UNCATEGORIZED = '(Tanpa Kategori)'

export default function RabItemsTable({
  projectId,
  items,
  ppnPercent,
}: {
  projectId: string
  items: RabItem[]
  ppnPercent: number
}) {
  const [query, setQuery] = useState('')

  const subtotal = items.reduce((sum, it) => sum + it.volume * it.unit_price, 0)
  const ppn = (subtotal * ppnPercent) / 100
  const total = subtotal + ppn
  const totalNilaiTkdn = items.reduce((sum, it) => sum + it.volume * it.unit_price * (it.tkdn_percent / 100), 0)
  const tkdnProjectPercent = subtotal > 0 ? (totalNilaiTkdn / subtotal) * 100 : 0

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter((it) => `${it.section ?? ''} ${it.name}`.toLowerCase().includes(q))
      : items

    const order: string[] = []
    const map = new Map<string, RabItem[]>()
    for (const it of filtered) {
      const key = it.section?.trim() || UNCATEGORIZED
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key)!.push(it)
    }
    // Kategori "Tanpa Kategori" selalu ditampilkan terakhir.
    order.sort((a, b) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : 0))
    return order.map((key) => ({
      section: key,
      rows: map.get(key)!,
      subtotal: map.get(key)!.reduce((sum, it) => sum + it.volume * it.unit_price, 0),
    }))
  }, [items, query])

  const visibleCount = groups.reduce((sum, g) => sum + g.rows.length, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari item atau kategori..."
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <span className="text-xs text-slate-400">
          {query ? `${visibleCount} dari ${items.length} item` : `${items.length} item`}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Uraian Pekerjaan</th>
            <th className="px-4 py-3 font-medium">Satuan</th>
            <th className="px-4 py-3 text-right font-medium">Volume</th>
            <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
            <th className="px-4 py-3 text-right font-medium">Jumlah</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        {groups.length === 0 && (
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                {items.length === 0 ? 'Belum ada item RAB.' : 'Tidak ada item yang cocok.'}
              </td>
            </tr>
          </tbody>
        )}
        {groups.map((g) => (
          <tbody key={g.section} className="divide-y divide-slate-100">
            <tr className="bg-slate-50/70">
              <td colSpan={6} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {g.section}
              </td>
            </tr>
            {g.rows.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-slate-900">{it.name}</td>
                <td className="px-4 py-3 text-slate-600">{it.unit}</td>
                <td className="px-4 py-3 text-right text-slate-600">{it.volume}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  <RabItemPriceEditor
                    id={it.id}
                    projectId={projectId}
                    unitPrice={it.unit_price}
                    tkdnPercent={it.tkdn_percent}
                  />
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatRupiah(it.volume * it.unit_price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteRabItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="project_id" value={projectId} />
                    <button className="text-xs text-red-600 hover:underline">Hapus</button>
                  </form>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="px-4 py-1.5 text-right text-xs text-slate-400">
                Subtotal {g.section}
              </td>
              <td className="px-4 py-1.5 text-right text-xs font-medium text-slate-500">
                {formatRupiah(g.subtotal)}
              </td>
              <td />
            </tr>
          </tbody>
        ))}
        <tfoot className="border-t border-slate-200 text-sm">
          <tr>
            <td colSpan={4} className="px-4 py-2 text-right text-slate-500">Subtotal</td>
            <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(subtotal)}</td>
            <td />
          </tr>
          <tr>
            <td colSpan={4} className="px-4 py-2 text-right text-slate-500">PPN ({ppnPercent}%)</td>
            <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(ppn)}</td>
            <td />
          </tr>
          <tr>
            <td colSpan={4} className="px-4 py-3 text-right font-semibold text-slate-900">Total RAB</td>
            <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">{formatRupiah(total)}</td>
            <td />
          </tr>
          <tr>
            <td colSpan={4} className="px-4 py-2 text-right text-emerald-700">Nilai TKDN Proyek</td>
            <td className="px-4 py-2 text-right font-medium text-emerald-700">{tkdnProjectPercent.toFixed(1)}%</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

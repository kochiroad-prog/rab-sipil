'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { AhspItem, AhspCategory } from '@/types/database'
import { deleteAhspItem } from '@/app/(dashboard)/ahsp/actions'

type ItemWithCategory = AhspItem & { ahsp_categories: (AhspCategory & { bidang: string | null }) | null }

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function AhspBrowser({
  items,
  userId,
}: {
  items: ItemWithCategory[]
  userId?: string
}) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const it of items) {
      if (it.category_id && it.ahsp_categories?.name) map.set(it.category_id, it.ahsp_categories.name)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (categoryId) list = list.filter((it) => it.category_id === categoryId)
    const q = query.trim().toLowerCase()
    if (q) {
      const tokens = q.split(/\s+/)
      list = list.filter((it) => {
        const haystack = `${it.code ?? ''} ${it.name} ${it.ahsp_categories?.name ?? ''}`.toLowerCase()
        return tokens.every((t) => haystack.includes(t))
      })
    }
    return list
  }, [items, query, categoryId])

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari kode atau nama pekerjaan..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-72"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">-- Semua Kategori --</option>
          {categoryOptions.map(([id, catName]) => (
            <option key={id} value={id}>
              {catName}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-slate-400">{filtered.length} item</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Nama Pekerjaan</th>
              <th className="px-4 py-3 font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
              <th className="px-4 py-3 text-right font-medium">TKDN</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada item yang cocok.
                </td>
              </tr>
            )}
            {filtered.slice(0, 300).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-slate-500">{it.code ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{it.ahsp_categories?.name ?? '-'}</td>
                <td className="px-4 py-3">
                  <Link href={`/ahsp/${it.id}`} className="text-slate-900 underline">
                    {it.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{it.unit}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(it.unit_price)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{it.tkdn_percent > 0 ? `${it.tkdn_percent}%` : '-'}</td>
                <td className="px-4 py-3 text-right">
                  {it.owner_id === userId && (
                    <form action={deleteAhspItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 300 && (
          <p className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-400">
            Menampilkan 300 dari {filtered.length} item — perhalus pencarian untuk mempersempit hasil.
          </p>
        )}
      </div>
    </>
  )
}

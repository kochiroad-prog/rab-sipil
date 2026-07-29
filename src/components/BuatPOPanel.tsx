'use client'

import { useMemo, useState } from 'react'
import { createPurchaseOrder } from '@/app/(dashboard)/projects/[id]/purchasing/po-actions'
import type { PurchaseRow } from '@/lib/takeoff-sipil'

type SupplierInfo = { id: string | null; name: string }

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function BuatPOPanel({
  projectId,
  rows,
  supplierByMaterialId,
}: {
  projectId: string
  rows: PurchaseRow[]
  supplierByMaterialId: Record<string, SupplierInfo>
}) {
  const matchedRows = useMemo(() => rows.filter((r) => r.matched && r.subtotal > 0), [rows])

  const groups = useMemo(() => {
    const map = new Map<string, { supplier: SupplierInfo; rows: PurchaseRow[] }>()
    for (const r of matchedRows) {
      const info = (r.matchedId && supplierByMaterialId[r.matchedId]) || { id: null, name: 'Tanpa Supplier' }
      const key = info.id ?? `noname:${info.name}`
      if (!map.has(key)) map.set(key, { supplier: info, rows: [] })
      map.get(key)!.rows.push(r)
    }
    return Array.from(map.values())
  }, [matchedRows, supplierByMaterialId])

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [retensi, setRetensi] = useState<Record<string, string>>({})

  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">Buat PO per Supplier</h3>
      {groups.map((g) => {
        const groupKey = g.supplier.id ?? `noname:${g.supplier.name}`
        const checkedRows = g.rows.filter((r) => selected[`${groupKey}:${r.key}`] !== false)
        const total = checkedRows.reduce((sum, r) => sum + r.subtotal, 0)

        return (
          <div key={groupKey} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-800">{g.supplier.name}</p>
              <p className="text-sm text-slate-500">{checkedRows.length} item · {formatRupiah(total)}</p>
            </div>
            <div className="mt-2 divide-y divide-slate-100 text-sm">
              {g.rows.map((r) => {
                const rowKey = `${groupKey}:${r.key}`
                const checked = selected[rowKey] !== false
                return (
                  <label key={rowKey} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [rowKey]: e.target.checked }))}
                      />
                      {r.materialName} <span className="text-xs text-slate-400">({r.purchaseQty} {r.purchaseUnit})</span>
                    </span>
                    <span className="text-slate-600">{formatRupiah(r.subtotal)}</span>
                  </label>
                )
              })}
            </div>
            <form action={createPurchaseOrder} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="supplier_id" value={g.supplier.id ?? ''} />
              <input type="hidden" name="supplier_name" value={g.supplier.name} />
              <input
                type="hidden"
                name="items_json"
                value={JSON.stringify(
                  checkedRows.map((r) => ({
                    materialId: r.matchedId,
                    materialName: r.materialName,
                    qty: r.purchaseQty,
                    unit: r.purchaseUnit,
                    unitPrice: r.unitPrice,
                  }))
                )}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Retensi %
                <input
                  name="retensi_pct"
                  type="number"
                  step="0.1"
                  value={retensi[groupKey] ?? '5'}
                  onChange={(e) => setRetensi((prev) => ({ ...prev, [groupKey]: e.target.value }))}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={checkedRows.length === 0}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Buat PO ({formatRupiah(total)})
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}

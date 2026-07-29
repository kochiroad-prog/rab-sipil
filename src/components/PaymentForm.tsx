'use client'

import { useMemo, useState } from 'react'
import { payPurchaseOrders } from '@/app/(dashboard)/purchasing/actions'
import type { PurchaseOrder } from '@/types/database'
import PhotoUploadInput from '@/components/PhotoUploadInput'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function PaymentForm({ supplierName, pos }: { supplierName: string; pos: PurchaseOrder[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pos.map((p) => [p.id, true]))
  )
  const [note, setNote] = useState('')

  const checkedPos = useMemo(() => pos.filter((p) => selected[p.id]), [pos, selected])
  const total = checkedPos.reduce((s, p) => s + p.total_amount, 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-800">{supplierName}</p>
        <p className="text-sm text-slate-500">{checkedPos.length} PO · {formatRupiah(total)}</p>
      </div>
      <div className="mt-2 divide-y divide-slate-100 text-sm">
        {pos.map((p) => (
          <label key={p.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!selected[p.id]}
                onChange={(e) => setSelected((prev) => ({ ...prev, [p.id]: e.target.checked }))}
              />
              {p.po_number} {p.invoice_number ? <span className="text-xs text-slate-400">(inv. {p.invoice_number})</span> : null}
            </span>
            <span className="text-slate-600">{formatRupiah(p.total_amount)}</span>
          </label>
        ))}
      </div>

      <form action={payPurchaseOrders} className="mt-3 space-y-2">
        {checkedPos.map((p) => (
          <input key={p.id} type="hidden" name="po_ids" value={p.id} />
        ))}
        <input type="hidden" name="supplier_name" value={supplierName} />
        <input type="hidden" name="total_amount" value={total} />
        <PhotoUploadInput name="proof_url" bucket="payment-proofs" accept="image/*,.pdf" label="Bukti Transfer" />
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan (opsional)"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={checkedPos.length === 0}
            className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-40"
          >
            Bayar {formatRupiah(total)}
          </button>
        </div>
      </form>
    </div>
  )
}

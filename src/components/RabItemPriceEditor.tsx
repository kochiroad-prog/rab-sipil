'use client'

import { useState } from 'react'
import { updateRabItem } from '@/app/(dashboard)/projects/actions'

export default function RabItemPriceEditor({
  id,
  projectId,
  unitPrice,
  tkdnPercent,
}: {
  id: string
  projectId: string
  unitPrice: number
  tkdnPercent: number
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-right hover:underline"
        title="Klik untuk edit harga & TKDN"
      >
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(unitPrice)}
        {tkdnPercent > 0 && <span className="ml-1 text-xs text-emerald-600">({tkdnPercent}% TKDN)</span>}
      </button>
    )
  }

  return (
    <form
      action={async (formData) => {
        await updateRabItem(formData)
        setEditing(false)
      }}
      className="flex items-center justify-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="project_id" value={projectId} />
      <input
        name="unit_price"
        type="number"
        step="1"
        defaultValue={unitPrice}
        className="w-24 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
      />
      <input
        name="tkdn_percent"
        type="number"
        step="0.1"
        min={0}
        max={100}
        defaultValue={tkdnPercent}
        title="TKDN %"
        className="w-14 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
      />
      <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
        OK
      </button>
    </form>
  )
}

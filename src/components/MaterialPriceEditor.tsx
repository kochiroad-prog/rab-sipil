'use client'

import { useState } from 'react'
import { updateMaterialPrice } from '@/app/(dashboard)/materials/actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function MaterialPriceEditor({ id, price }: { id: string; price: number }) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-right hover:underline"
        title="Klik untuk edit harga"
      >
        {formatRupiah(price)}
      </button>
    )
  }

  return (
    <form
      action={async (formData) => {
        await updateMaterialPrice(formData)
        setEditing(false)
      }}
      className="flex items-center justify-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="price"
        type="number"
        step="1"
        defaultValue={price}
        className="w-24 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
      />
      <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
        OK
      </button>
    </form>
  )
}

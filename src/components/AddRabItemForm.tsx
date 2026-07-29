'use client'

import { useRef, useState } from 'react'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import { addRabItem } from '@/app/(dashboard)/projects/actions'

export default function AddRabItemForm({
  projectId,
  ahspItems,
}: {
  projectId: string
  ahspItems: AhspOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [comboKey, setComboKey] = useState(0)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [tkdn, setTkdn] = useState('')

  function handleAhspSelect(item: AhspOption | null) {
    if (!item) return
    setName(item.name)
    setUnit(item.unit)
    setUnitPrice(String(item.unit_price))
    if (item.tkdn_percent > 0) setTkdn(String(item.tkdn_percent))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Tambah Item Manual</h3>
      <form
        ref={formRef}
        action={async (formData) => {
          await addRabItem(formData)
          formRef.current?.reset()
          setName('')
          setUnit('')
          setUnitPrice('')
          setTkdn('')
          setComboKey((k) => k + 1)
        }}
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <input
          name="section"
          placeholder="Kategori (opsional)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <AhspCombobox
          key={comboKey}
          items={ahspItems}
          onSelect={handleAhspSelect}
          className="sm:col-span-2"
        />
        <input
          name="name"
          required
          placeholder="Nama pekerjaan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <input
          name="unit"
          required
          placeholder="Satuan"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <input
          name="volume"
          type="number"
          step="0.01"
          required
          placeholder="Volume"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <input
          name="unit_price"
          type="number"
          step="1"
          required
          placeholder="Harga satuan"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <input
          name="tkdn_percent"
          type="number"
          step="0.1"
          min={0}
          max={100}
          placeholder="TKDN % (opsional)"
          value={tkdn}
          onChange={(e) => setTkdn(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1"
        />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
          Tambah
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-400">
        Cari referensi AHSP untuk mengisi nama, satuan, harga &amp; TKDN otomatis — semua field tetap bisa diedit manual.
      </p>
    </div>
  )
}

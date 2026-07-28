'use client'

import { useMemo, useState } from 'react'
import { calcElement, type ElementDimensions } from '@/lib/volume-calc'
import type { ElementType } from '@/types/database'
import { addStructuralElement } from '@/app/(dashboard)/projects/[id]/volume/actions'

const LABELS: Record<ElementType, { length: string; width: string; height: string }> = {
  kolom: { length: 'Tinggi Kolom (m)', width: 'Lebar Penampang (m)', height: 'Tinggi Penampang (m)' },
  balok: { length: 'Panjang Bentang (m)', width: 'Lebar Penampang (m)', height: 'Tinggi Penampang (m)' },
  sloof: { length: 'Panjang Bentang (m)', width: 'Lebar Penampang (m)', height: 'Tinggi Penampang (m)' },
  plat: { length: 'Bentang X (m)', width: 'Bentang Y (m)', height: '' },
}

export default function VolumeElementForm({ projectId }: { projectId: string }) {
  const [elementType, setElementType] = useState<ElementType>('kolom')
  const [dims, setDims] = useState<ElementDimensions>({
    element_type: 'kolom',
    quantity: 1,
    length_m: 0,
    width_m: 0,
    height_m: 0,
    thickness_m: 0,
    main_bar_dia_mm: 0,
    main_bar_count: 0,
    main_bar_spacing_m: 0,
    stirrup_dia_mm: 0,
    stirrup_spacing_m: 0,
  })

  const preview = useMemo(() => calcElement({ ...dims, element_type: elementType }), [dims, elementType])
  const isPlat = elementType === 'plat'
  const labels = LABELS[elementType]

  function set<K extends keyof ElementDimensions>(key: K, value: ElementDimensions[K]) {
    setDims((d) => ({ ...d, [key]: value }))
  }

  return (
    <form
      action={addStructuralElement}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <h3 className="font-medium text-slate-900">Tambah Elemen Struktur</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Jenis Elemen</label>
          <select
            name="element_type"
            value={elementType}
            onChange={(e) => setElementType(e.target.value as ElementType)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="kolom">Kolom</option>
            <option value="balok">Balok</option>
            <option value="sloof">Sloof</option>
            <option value="plat">Plat Lantai</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Nama / Kode</label>
          <input name="name" required placeholder="K1, B1, Plat Lt.2" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Kategori (opsional)</label>
          <input name="section" placeholder="Lantai 1" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Jumlah Elemen Identik</label>
          <input
            name="quantity"
            type="number"
            min={1}
            value={dims.quantity}
            onChange={(e) => set('quantity', Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">{labels.length}</label>
          <input
            name="length_m"
            type="number"
            step="0.01"
            value={dims.length_m}
            onChange={(e) => set('length_m', Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">{labels.width}</label>
          <input
            name="width_m"
            type="number"
            step="0.01"
            value={dims.width_m}
            onChange={(e) => set('width_m', Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {!isPlat && (
          <div>
            <label className="block text-xs font-medium text-slate-600">{labels.height}</label>
            <input
              name="height_m"
              type="number"
              step="0.01"
              value={dims.height_m}
              onChange={(e) => set('height_m', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        {isPlat && (
          <div>
            <label className="block text-xs font-medium text-slate-600">Tebal Plat (m)</label>
            <input
              name="thickness_m"
              type="number"
              step="0.01"
              value={dims.thickness_m}
              onChange={(e) => set('thickness_m', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600">Mutu Beton</label>
          <input name="concrete_class" placeholder="K-225 / fc'20" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div>
          <label className="block text-xs font-medium text-slate-600">Diameter Tulangan Utama (mm)</label>
          <input
            name="main_bar_dia_mm"
            type="number"
            step="0.1"
            value={dims.main_bar_dia_mm}
            onChange={(e) => set('main_bar_dia_mm', Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {!isPlat && (
          <div>
            <label className="block text-xs font-medium text-slate-600">Jumlah Tulangan Utama</label>
            <input
              name="main_bar_count"
              type="number"
              value={dims.main_bar_count}
              onChange={(e) => set('main_bar_count', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        {isPlat && (
          <div>
            <label className="block text-xs font-medium text-slate-600">Jarak Tulangan (m)</label>
            <input
              name="main_bar_spacing_m"
              type="number"
              step="0.01"
              value={dims.main_bar_spacing_m}
              onChange={(e) => set('main_bar_spacing_m', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}
        {!isPlat && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600">Diameter Sengkang (mm)</label>
              <input
                name="stirrup_dia_mm"
                type="number"
                step="0.1"
                value={dims.stirrup_dia_mm}
                onChange={(e) => set('stirrup_dia_mm', Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Jarak Sengkang (m)</label>
              <input
                name="stirrup_spacing_m"
                type="number"
                step="0.01"
                value={dims.stirrup_spacing_m}
                onChange={(e) => set('stirrup_spacing_m', Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3 text-sm">
        <div className="flex gap-6">
          <span>
            Volume Beton: <strong>{preview.volume_beton_m3.toFixed(3)} m³</strong>
          </span>
          <span>
            Bekisting: <strong>{preview.volume_bekisting_m2.toFixed(2)} m²</strong>
          </span>
          <span>
            Besi: <strong>{preview.berat_besi_kg.toFixed(1)} kg</strong>
          </span>
        </div>
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Tambah Elemen
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Perhitungan estimasi standar (berat besi = π/4·d²·7850, sengkang = panjang/jarak+1). Bukan pengganti hitungan structural engineer.
      </p>
    </form>
  )
}

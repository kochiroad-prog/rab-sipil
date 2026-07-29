'use client'

import { useMemo, useRef, useState } from 'react'
import type { FormulaType, VolumeRecipe, VolumeRecipeItem } from '@/types/database'
import { calcBaseTotal, FORMULA_LABEL, type GenericDimensions } from '@/lib/volume-generic-calc'
import { addVolumeGenericEntry } from '@/app/(dashboard)/projects/[id]/volume/actions'

export type RecipeWithItems = VolumeRecipe & { items: VolumeRecipeItem[] }

const DIM_FIELDS: Record<FormulaType, { key: keyof GenericDimensions; label: string }[]> = {
  pxlxt: [
    { key: 'panjang_m', label: 'Panjang (m)' },
    { key: 'lebar_m', label: 'Lebar (m)' },
    { key: 'tinggi_m', label: 'Tinggi / Tebal (m)' },
  ],
  pxl: [
    { key: 'panjang_m', label: 'Panjang (m)' },
    { key: 'lebar_m', label: 'Lebar / Tinggi (m)' },
  ],
  keliling: [
    { key: 'panjang_m', label: 'Panjang Ruang (m)' },
    { key: 'lebar_m', label: 'Lebar Ruang (m)' },
    { key: 'tinggi_m', label: 'Tinggi (m) — kosongkan jika hanya perlu keliling m1' },
  ],
  trapesium: [
    { key: 'panjang_m', label: 'Panjang (m)' },
    { key: 'lebar_atas_m', label: 'Lebar Atas (m)' },
    { key: 'lebar_bawah_m', label: 'Lebar Bawah (m)' },
    { key: 'tinggi_m', label: 'Tinggi (m)' },
  ],
  custom: [{ key: 'custom_volume', label: 'Volume / Qty Dasar (manual)' }],
}

const EMPTY_DIMS: GenericDimensions = {
  formula_type: 'pxlxt',
  quantity: 1,
  panjang_m: 0,
  lebar_m: 0,
  lebar_atas_m: 0,
  lebar_bawah_m: 0,
  tinggi_m: 0,
  custom_volume: 0,
}

export default function VolumeGenericForm({
  projectId,
  recipes,
}: {
  projectId: string
  recipes: RecipeWithItems[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? '')
  const [dims, setDims] = useState<GenericDimensions>({ ...EMPTY_DIMS, formula_type: recipes[0]?.formula_type ?? 'pxlxt' })

  const recipe = useMemo(() => recipes.find((r) => r.id === recipeId) ?? null, [recipes, recipeId])

  const baseTotal = useMemo(() => calcBaseTotal({ ...dims, formula_type: recipe?.formula_type ?? 'pxlxt' }), [dims, recipe])

  function set<K extends keyof GenericDimensions>(key: K, value: GenericDimensions[K]) {
    setDims((d) => ({ ...d, [key]: value }))
  }

  function handleRecipeChange(id: string) {
    setRecipeId(id)
    const r = recipes.find((x) => x.id === id)
    setDims({ ...EMPTY_DIMS, formula_type: r?.formula_type ?? 'pxlxt' })
  }

  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Belum ada resep volume. Buat resep dulu di halaman Resep Volume.
      </div>
    )
  }

  const fields = DIM_FIELDS[recipe?.formula_type ?? 'pxlxt']

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addVolumeGenericEntry(formData)
        formRef.current?.reset()
        setDims({ ...EMPTY_DIMS, formula_type: recipe?.formula_type ?? 'pxlxt' })
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="recipe_id" value={recipeId} />
      <input type="hidden" name="recipe_name" value={recipe?.name ?? ''} />
      <input type="hidden" name="formula_type" value={recipe?.formula_type ?? ''} />

      <h3 className="font-medium text-slate-900">Generator Volume Umum (Multi-Item)</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600">Resep</label>
          <select
            value={recipeId}
            onChange={(e) => handleRecipeChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Nama / Kode</label>
          <input name="name" required placeholder="Pondasi As A-A" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Kategori (opsional)</label>
          <input name="section" placeholder="Lantai 1" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Jumlah Identik</label>
          <input
            name="quantity"
            type="number"
            min={1}
            step="1"
            value={dims.quantity}
            onChange={(e) => set('quantity', Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {recipe?.description && <p className="text-xs text-slate-400">{recipe.description}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-slate-600">{f.label}</label>
            <input
              name={f.key}
              type="number"
              step="0.01"
              value={dims[f.key]}
              onChange={(e) => set(f.key, Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="rounded-md bg-slate-50 p-4 text-sm">
        <p className="text-slate-600">
          Rumus: {FORMULA_LABEL[recipe?.formula_type ?? 'pxlxt']}
        </p>
        <p className="mt-1">
          Volume Dasar Total: <strong>{baseTotal.toFixed(3)}</strong>
        </p>
        {recipe && recipe.items.length > 0 && (
          <table className="mt-3 w-full text-xs">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="pb-1 font-medium">Item RAB yang dihasilkan</th>
                <th className="pb-1 text-right font-medium">Koefisien</th>
                <th className="pb-1 text-right font-medium">Volume</th>
                <th className="pb-1 text-right font-medium">Satuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recipe.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-1 text-slate-700">{it.name}</td>
                  <td className="py-1 text-right text-slate-500">{it.coefficient}</td>
                  <td className="py-1 text-right font-medium text-slate-900">
                    {(baseTotal * it.coefficient).toFixed(3)}
                  </td>
                  <td className="py-1 text-right text-slate-500">{it.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Tambah Generator
        </button>
      </div>
    </form>
  )
}

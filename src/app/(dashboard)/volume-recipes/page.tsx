import { createClient } from '@/lib/supabase/server'
import type { FormulaType, VolumeRecipe, VolumeRecipeItem } from '@/types/database'
import type { AhspOption } from '@/components/AhspCombobox'
import RecipeItemForm from '@/components/RecipeItemForm'
import { addVolumeRecipe, deleteVolumeRecipe, deleteVolumeRecipeItem } from './actions'

const FORMULA_OPTIONS: { value: FormulaType; label: string }[] = [
  { value: 'pxlxt', label: 'Panjang x Lebar x Tinggi (m3)' },
  { value: 'pxl', label: 'Panjang x Lebar (m2)' },
  { value: 'keliling', label: 'Keliling (m1 / m2)' },
  { value: 'trapesium', label: 'Trapesium (m3)' },
  { value: 'custom', label: 'Input Manual' },
]

const FORMULA_BADGE: Record<FormulaType, string> = {
  pxlxt: 'bg-blue-50 text-blue-700',
  pxl: 'bg-emerald-50 text-emerald-700',
  keliling: 'bg-amber-50 text-amber-700',
  trapesium: 'bg-purple-50 text-purple-700',
  custom: 'bg-slate-100 text-slate-600',
}

type ItemWithAhsp = VolumeRecipeItem & { ahsp_items: { name: string } | null }
type RecipeRow = VolumeRecipe & { volume_recipe_items: ItemWithAhsp[] }

export default async function VolumeRecipesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: recipesRaw } = await supabase
    .from('volume_recipes')
    .select('*, volume_recipe_items(*, ahsp_items(name))')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'volume_recipe_items' })
    .returns<RecipeRow[]>()

  const recipes = recipesRaw ?? []

  const { data: ahspItemsRaw } = await supabase
    .from('ahsp_items')
    .select('id, code, name, unit, unit_price, tkdn_percent, ahsp_categories(name)')
    .order('name', { ascending: true })
    .returns<
      { id: string; code: string | null; name: string; unit: string; unit_price: number; tkdn_percent: number; ahsp_categories: { name: string } | null }[]
    >()

  const ahspItems: AhspOption[] = (ahspItemsRaw ?? []).map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    unit: a.unit,
    unit_price: a.unit_price,
    tkdn_percent: a.tkdn_percent,
    category_name: a.ahsp_categories?.name ?? null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Resep Volume</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resep generator volume generik untuk Backup Volume — satu input dimensi menghasilkan beberapa baris RAB
          sekaligus (mis. Pondasi Batu Kali -&gt; Galian + Urug Pasir + Aanstamping + Batu Belah). Resep tanpa
          pemilik = bawaan sistem; resep yang kamu buat hanya terlihat olehmu.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Tambah Resep Baru</h3>
        <form action={addVolumeRecipe} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input name="name" required placeholder="Nama resep" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="formula_type" required defaultValue="" className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="" disabled>-- Tipe Rumus --</option>
            {FORMULA_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <input name="description" placeholder="Deskripsi singkat (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Tambah Resep
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {recipes.length === 0 && (
          <p className="text-sm text-slate-500">Belum ada resep.</p>
        )}
        {recipes.map((r) => {
          const isOwner = r.owner_id === user?.id
          const items = r.volume_recipe_items ?? []
          return (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{r.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${FORMULA_BADGE[r.formula_type]}`}>
                      {FORMULA_OPTIONS.find((f) => f.value === r.formula_type)?.label}
                    </span>
                    {!r.owner_id && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Bawaan</span>}
                  </div>
                  {r.description && <p className="mt-1 text-sm text-slate-500">{r.description}</p>}
                </div>
                {isOwner && (
                  <form action={deleteVolumeRecipe}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-red-600 hover:underline">Hapus Resep</button>
                  </form>
                )}
              </div>

              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs text-slate-400">
                  <tr>
                    <th className="py-1 font-medium">Item RAB</th>
                    <th className="py-1 font-medium">Satuan</th>
                    <th className="py-1 text-right font-medium">Koefisien</th>
                    <th className="py-1 font-medium">Ref AHSP</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-2 text-slate-400">Belum ada item.</td>
                    </tr>
                  )}
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 text-slate-800">{it.name}</td>
                      <td className="py-1.5 text-slate-500">{it.unit}</td>
                      <td className="py-1.5 text-right text-slate-500">{it.coefficient}</td>
                      <td className="py-1.5 text-slate-500">{it.ahsp_items?.name ?? '-'}</td>
                      <td className="py-1.5 text-right">
                        {isOwner && (
                          <form action={deleteVolumeRecipeItem}>
                            <input type="hidden" name="id" value={it.id} />
                            <button className="text-xs text-red-600 hover:underline">Hapus</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isOwner && <RecipeItemForm recipeId={r.id} ahspItems={ahspItems} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

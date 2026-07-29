'use client'

import { useRef } from 'react'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import { addVolumeRecipeItem } from '@/app/(dashboard)/volume-recipes/actions'

export default function RecipeItemForm({ recipeId, ahspItems }: { recipeId: string; ahspItems: AhspOption[] }) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addVolumeRecipeItem(formData)
        formRef.current?.reset()
      }}
      className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5"
    >
      <input type="hidden" name="recipe_id" value={recipeId} />
      <input name="name" required placeholder="Nama item RAB" className="rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:col-span-2" />
      <input name="unit" required placeholder="Satuan" className="rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
      <input
        name="coefficient"
        type="number"
        step="0.0001"
        defaultValue={1}
        placeholder="Koefisien"
        className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
      />
      <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
        + Item
      </button>
      <AhspCombobox
        items={ahspItems}
        placeholder="Link referensi AHSP (opsional)"
        className="sm:col-span-5"
      />
    </form>
  )
}

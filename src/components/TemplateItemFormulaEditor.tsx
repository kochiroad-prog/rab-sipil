'use client'

import { useState } from 'react'
import { updateTemplateItemFormula } from '@/app/(dashboard)/templates/actions'

export default function TemplateItemFormulaEditor({
  id,
  templateId,
  formula,
  coefficient,
}: {
  id: string
  templateId: string
  formula: string | null
  coefficient: number
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left text-xs text-slate-500 hover:underline"
        title="Klik untuk edit formula & koefisien"
      >
        {formula ? (
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{formula}</code>
        ) : (
          <span className="text-slate-400">tanpa formula</span>
        )}
        <span className="ml-1">&times; {coefficient}</span>
      </button>
    )
  }

  return (
    <form
      action={async (formData) => {
        await updateTemplateItemFormula(formData)
        setEditing(false)
      }}
      className="flex flex-wrap items-center gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="template_id" value={templateId} />
      <input
        name="formula"
        defaultValue={formula ?? ''}
        placeholder="mis. panjang * lebar"
        className="w-40 rounded border border-slate-300 px-1.5 py-1 text-xs"
      />
      <input
        name="coefficient"
        type="number"
        step="0.0001"
        defaultValue={coefficient}
        title="Koefisien"
        className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs"
      />
      <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
        OK
      </button>
    </form>
  )
}

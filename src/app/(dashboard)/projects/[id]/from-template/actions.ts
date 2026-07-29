'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeItemVolume, type FormulaVars } from '@/lib/formula-eval'

export async function applyTemplateToProject(formData: FormData) {
  const supabase = await createClient()
  const project_id = String(formData.get('project_id') ?? '')
  const template_id = String(formData.get('template_id') ?? '')
  const label = String(formData.get('name') ?? '').trim()
  const section = String(formData.get('section') ?? '').trim() || null
  const answersJson = String(formData.get('answers_json') ?? '{}')

  if (!project_id || !template_id) return

  let answersRaw: Record<string, unknown> = {}
  try {
    answersRaw = JSON.parse(answersJson)
  } catch {
    answersRaw = {}
  }
  const vars: FormulaVars = {}
  for (const [k, v] of Object.entries(answersRaw)) {
    const n = Number(v)
    if (Number.isFinite(n)) vars[k] = n
  }

  const { data: items } = await supabase
    .from('job_template_items')
    .select('*, ahsp_items(name, unit, unit_price, tkdn_percent)')
    .eq('template_id', template_id)
    .order('sort_order')

  if (!items || items.length === 0) return

  const rows = items.map((it) => {
    const { value } = computeItemVolume(it.formula, it.coefficient, vars)
    const ahsp = it.ahsp_items as { name: string; unit: string; unit_price: number; tkdn_percent: number } | null
    return {
      project_id,
      section,
      ahsp_item_id: it.ahsp_item_id,
      name: label ? `${it.name} - ${label}` : it.name,
      unit: it.unit,
      volume: Math.max(0, Math.round(value * 10000) / 10000),
      unit_price: ahsp?.unit_price ?? 0,
      tkdn_percent: ahsp?.tkdn_percent ?? 0,
    }
  })

  await supabase.from('rab_items').insert(rows)

  revalidatePath(`/projects/${project_id}`)
  redirect(`/projects/${project_id}`)
}

'use client'

import { useMemo, useRef, useState } from 'react'
import type { JobTemplate, JobTemplateQuestion, JobTemplateItem } from '@/types/database'
import { computeItemVolume, type FormulaVars } from '@/lib/formula-eval'
import { applyTemplateToProject } from '@/app/(dashboard)/projects/[id]/from-template/actions'

export type TemplateWithDetails = JobTemplate & {
  job_template_questions: JobTemplateQuestion[]
  job_template_items: JobTemplateItem[]
}

export default function TemplateApplyForm({
  projectId,
  templates,
}: {
  projectId: string
  templates: TemplateWithDetails[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const template = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId])
  const numberQuestions = useMemo(
    () => (template?.job_template_questions ?? []).filter((q) => q.qtype === 'number'),
    [template]
  )

  const vars: FormulaVars = useMemo(() => {
    const v: FormulaVars = {}
    for (const q of numberQuestions) {
      const n = Number(answers[q.key])
      v[q.key] = Number.isFinite(n) ? n : 0
    }
    return v
  }, [numberQuestions, answers])

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    setAnswers({})
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        Belum ada template pekerjaan. Buat dulu di halaman Template.
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={applyTemplateToProject}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="template_id" value={templateId} />
      <input type="hidden" name="answers_json" value={JSON.stringify(answers)} />

      <h3 className="font-medium text-slate-900">Terapkan Template ke RAB</h3>
      <p className="text-xs text-slate-400">
        Jawab pertanyaan angka di bawah — volume tiap item RAB terhitung otomatis dari formula template. Hanya
        pertanyaan bertipe angka yang dipakai untuk kalkulasi.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Template</label>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Nama / Label (opsional)</label>
          <input name="name" placeholder="mis. Rumah Blok A" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Kategori (opsional)</label>
          <input name="section" placeholder="Lantai 1" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {template?.description && <p className="text-xs text-slate-400">{template.description}</p>}

      {numberQuestions.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {numberQuestions.map((q) => (
            <div key={q.key}>
              <label className="block text-xs font-medium text-slate-600">
                {q.label} {q.unit ? `(${q.unit})` : ''}
              </label>
              <input
                type="number"
                step="0.01"
                value={answers[q.key] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {template && template.job_template_items.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="pb-1 font-medium">Item RAB</th>
              <th className="pb-1 font-medium">Formula</th>
              <th className="pb-1 text-right font-medium">Volume</th>
              <th className="pb-1 text-right font-medium">Satuan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {template.job_template_items.map((it) => {
              const { value, error } = computeItemVolume(it.formula, it.coefficient, vars)
              return (
                <tr key={it.id}>
                  <td className="py-1.5 text-slate-800">{it.name}</td>
                  <td className="py-1.5 text-slate-400">
                    {it.formula ? <code>{it.formula}</code> : `qty tetap x${it.coefficient}`}
                  </td>
                  <td className="py-1.5 text-right font-medium text-slate-900">
                    {error ? <span className="text-red-600">{error}</span> : value.toFixed(3)}
                  </td>
                  <td className="py-1.5 text-right text-slate-500">{it.unit}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="flex justify-end">
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Terapkan ke RAB
        </button>
      </div>
    </form>
  )
}

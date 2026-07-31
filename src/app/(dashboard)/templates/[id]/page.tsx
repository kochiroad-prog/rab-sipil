import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { JobTemplate, JobTemplateQuestion, JobTemplateItem } from '@/types/database'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import TemplateItemFormulaEditor from '@/components/TemplateItemFormulaEditor'
import { fetchAllRows } from '@/lib/supabase-paginate'
import {
  addTemplateQuestion,
  deleteTemplateQuestion,
  addTemplateItem,
  deleteTemplateItem,
  deleteTemplate,
} from '../actions'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: template } = await supabase.from('job_templates').select('*').eq('id', id).single<JobTemplate>()
  if (!template) notFound()

  const { data: questions } = await supabase
    .from('job_template_questions')
    .select('*')
    .eq('template_id', id)
    .order('sort_order')
    .returns<JobTemplateQuestion[]>()

  const { data: items } = await supabase
    .from('job_template_items')
    .select('*')
    .eq('template_id', id)
    .order('sort_order')
    .returns<JobTemplateItem[]>()

  type AhspItemRaw = { id: string; code: string | null; name: string; unit: string; unit_price: number; tkdn_percent: number; ahsp_categories: { name: string } | null }
  const ahspItemsRaw = await fetchAllRows<AhspItemRaw>((from, to) =>
    supabase
      .from('ahsp_items')
      .select('id, code, name, unit, unit_price, tkdn_percent, ahsp_categories(name)')
      .order('name', { ascending: true })
      .range(from, to)
      .returns<AhspItemRaw[]>(),
  )

  const ahspItems: AhspOption[] = ahspItemsRaw.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    unit: a.unit,
    unit_price: a.unit_price,
    tkdn_percent: a.tkdn_percent,
    category_name: a.ahsp_categories?.name ?? null,
  }))

  const numberKeys = (questions ?? []).filter((q) => q.qtype === 'number').map((q) => q.key)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/templates" className="text-sm text-slate-500 hover:underline">
            &larr; Kembali ke Template Pekerjaan
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{template.name}</h1>
          {template.description && <p className="mt-1 text-sm text-slate-500">{template.description}</p>}
        </div>
        <form action={deleteTemplate}>
          <input type="hidden" name="id" value={template.id} />
          <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Hapus Template
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Pertanyaan Klarifikasi</h3>
        <form action={addTemplateQuestion} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input type="hidden" name="template_id" value={template.id} />
          <input name="key" required placeholder="key (mis. tinggi)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="label" required placeholder="Label pertanyaan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <select name="qtype" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" defaultValue="single">
            <option value="single">Pilihan tunggal</option>
            <option value="multi">Pilihan ganda</option>
            <option value="number">Angka</option>
          </select>
          <input name="unit" placeholder="Satuan (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="options" placeholder="Opsi, pisah koma" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
        </form>

        <ul className="mt-4 divide-y divide-slate-100">
          {(questions ?? []).length === 0 && <li className="py-3 text-sm text-slate-500">Belum ada pertanyaan.</li>}
          {(questions ?? []).map((q) => (
            <li key={q.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-medium text-slate-900">{q.label}</span>
                <span className="ml-2 text-slate-400">({q.qtype}{q.unit ? `, ${q.unit}` : ''})</span>
                {q.options.length > 0 && <span className="ml-2 text-slate-400">{q.options.join(' / ')}</span>}
              </span>
              <form action={deleteTemplateQuestion}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="template_id" value={template.id} />
                <button className="text-xs text-red-600 hover:underline">Hapus</button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Item Standar (checklist rincian RAB)</h3>
        <p className="mt-1 text-xs text-slate-400">
          Formula opsional memakai variabel dari pertanyaan angka di atas
          {numberKeys.length > 0 ? (
            <>
              : <code className="rounded bg-slate-100 px-1 py-0.5">{numberKeys.join(', ')}</code>
            </>
          ) : (
            ' (belum ada pertanyaan bertipe angka)'
          )}
          . Contoh: <code className="rounded bg-slate-100 px-1 py-0.5">panjang * lebar</code>. Kosongkan formula
          untuk qty tetap sebesar koefisien.
        </p>
        <form action={addTemplateItem} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input type="hidden" name="template_id" value={template.id} />
          <input name="name" required placeholder="Nama item" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="unit" required placeholder="Satuan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="formula" placeholder="Formula (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="coefficient" type="number" step="0.0001" defaultValue={1} placeholder="Koefisien" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
          <AhspCombobox items={ahspItems} placeholder="Link referensi AHSP (opsional)" className="sm:col-span-6" />
        </form>

        <ul className="mt-4 divide-y divide-slate-100">
          {(items ?? []).length === 0 && <li className="py-3 text-sm text-slate-500">Belum ada item standar.</li>}
          {(items ?? []).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span>{it.name} <span className="text-slate-400">({it.unit})</span></span>
                <div className="mt-0.5">
                  <TemplateItemFormulaEditor
                    id={it.id}
                    templateId={template.id}
                    formula={it.formula}
                    coefficient={it.coefficient}
                  />
                </div>
              </div>
              <form action={deleteTemplateItem}>
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="template_id" value={template.id} />
                <button className="text-xs text-red-600 hover:underline">Hapus</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

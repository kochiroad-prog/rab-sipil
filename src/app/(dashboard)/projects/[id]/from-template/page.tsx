import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'
import TemplateApplyForm, { type TemplateWithDetails } from '@/components/TemplateApplyForm'

export default async function FromTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: templatesRaw } = await supabase
    .from('job_templates')
    .select('*, job_template_questions(*), job_template_items(*)')
    .eq('is_active', true)
    .order('name')
    .order('sort_order', { referencedTable: 'job_template_questions' })
    .order('sort_order', { referencedTable: 'job_template_items' })
    .returns<TemplateWithDetails[]>()

  const templates = templatesRaw ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-slate-500 hover:underline">
          &larr; Kembali ke {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Terapkan Template Pekerjaan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pilih template, jawab pertanyaan dimensi/jumlah, lalu volume tiap item RAB dihitung otomatis dari formula
          template (bisa disesuaikan di halaman Template).
        </p>
      </div>

      <TemplateApplyForm projectId={id} templates={templates} />
    </div>
  )
}

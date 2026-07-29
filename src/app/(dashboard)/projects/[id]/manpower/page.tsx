import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, ManpowerPlan } from '@/types/database'
import ManpowerClient from '@/components/ManpowerClient'

export default async function ManpowerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: lastPlan } = await supabase
    .from('manpower_plans')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ManpowerPlan>()

  const { count: rabItemCount } = await supabase
    .from('rab_items')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-slate-500 hover:underline">
          &larr; Kembali ke {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Rencana Tenaga Kerja</h1>
      </div>

      {!rabItemCount ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Belum ada item RAB di proyek ini. Tambahkan dulu rincian pekerjaan di{' '}
          <Link href={`/projects/${id}`} className="text-blue-700 underline">
            halaman proyek
          </Link>{' '}
          sebelum generate rencana tenaga kerja — AI menganalisa dari situ.
        </div>
      ) : (
        <ManpowerClient projectId={id} initial={lastPlan?.ai_result ?? null} />
      )}
    </div>
  )
}

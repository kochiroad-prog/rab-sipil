import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { AhspOption } from '@/components/AhspCombobox'
import type { AiEstimation } from '@/types/database'
import EstimatorTabs from '@/components/EstimatorTabs'
import { isImageUrl } from '@/lib/url-utils'
import { fetchAllRows } from '@/lib/supabase-paginate'

export default async function EstimatorPage() {
  const supabase = await createClient()

  const { data: projectsRaw } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false })
  const projects = projectsRaw ?? []

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

  const { data: historyRaw } = await supabase
    .from('ai_estimations')
    .select('id, job_name, image_urls, status, confidence, items_count, created_at, project_id, projects(name)')
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<(AiEstimation & { projects: { name: string } | null })[]>()
  const history = historyRaw ?? []

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    questions: 'Menunggu jawaban',
    saved: 'Tersimpan ke RAB',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Estimator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Analisa foto lokasi / gambar kerja lintas proyek. Riwayat analisa (foto & hasil) tersimpan permanen di
          bawah.
        </p>
      </div>

      <EstimatorTabs projects={projects} ahspItems={ahspItems} />

      <div>
        <h2 className="text-sm font-medium text-slate-700">Riwayat Analisa</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Belum ada riwayat analisa.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((h) => (
              <Link
                key={h.id}
                href={`/estimator/${h.id}`}
                className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex gap-2">
                  {h.image_urls.slice(0, 3).map((u) =>
                    isImageUrl(u) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={u} src={u} alt="foto" className="h-14 w-14 rounded-md object-cover" />
                    ) : null
                  )}
                  {h.image_urls.length === 0 && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-50 text-[10px] text-slate-400">
                      tanpa foto
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-slate-900">{h.job_name ?? 'Belum diberi nama'}</p>
                <p className="text-xs text-slate-500">
                  {STATUS_LABEL[h.status] ?? h.status}
                  {h.projects?.name ? ` · ${h.projects.name}` : ''}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{new Date(h.created_at).toLocaleString('id-ID')}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

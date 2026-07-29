import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AiEstimation } from '@/types/database'
import { isImageUrl } from '@/lib/upload-client'

type VisionQuestion = { key: string; label: string; unit?: string }

export default async function EstimationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: est } = await supabase
    .from('ai_estimations')
    .select('*, projects(id, name)')
    .eq('id', id)
    .single<AiEstimation & { projects: { id: string; name: string } | null }>()

  if (!est) notFound()

  const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    questions: 'Menunggu jawaban',
    saved: 'Tersimpan ke RAB',
  }

  const questions = Array.isArray(est.questions) ? (est.questions as VisionQuestion[]) : []
  const answers = est.answers ?? {}

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/estimator" className="text-sm text-slate-500 hover:underline">
          ← Kembali ke AI Estimator
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{est.job_name ?? 'Belum diberi nama'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {STATUS_LABEL[est.status] ?? est.status}
          {est.projects?.name && (
            <>
              {' · proyek '}
              <Link href={`/projects/${est.projects.id}`} className="text-blue-700 hover:underline">
                {est.projects.name}
              </Link>
            </>
          )}
          {' · '}
          {new Date(est.created_at).toLocaleString('id-ID')}
        </p>
      </div>

      {est.image_urls.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-700">Foto</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {est.image_urls.map((u) =>
              isImageUrl(u) ? (
                <a key={u} href={u} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="foto lokasi" className="h-28 w-28 rounded-md border border-slate-200 object-cover" />
                </a>
              ) : (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline">
                  Lihat file
                </a>
              )
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        {est.confidence && <p><span className="text-slate-500">Confidence:</span> {est.confidence}</p>}
        {est.template_name && <p><span className="text-slate-500">Cocok template:</span> {est.template_name}</p>}
        {est.hints && <p className="mt-1"><span className="text-slate-500">Keterangan awal:</span> {est.hints}</p>}
        {est.notes && <p className="mt-1"><span className="text-slate-500">Catatan AI:</span> {est.notes}</p>}
        {est.items_count != null && (
          <p className="mt-1"><span className="text-slate-500">Item tersimpan ke RAB:</span> {est.items_count}</p>
        )}
      </div>

      {questions.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-700">Pertanyaan &amp; Jawaban</h2>
          <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {questions.map((q) => (
              <div key={q.key} className="flex items-center justify-between gap-2 px-4 py-2">
                <span className="text-slate-500">{q.label}{q.unit ? ` (${q.unit})` : ''}</span>
                <span className="font-medium text-slate-900">{answers[q.key] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

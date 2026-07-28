import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { JobTemplate } from '@/types/database'
import { createTemplate } from './actions'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: templates } = await supabase
    .from('job_templates')
    .select('*')
    .order('name')
    .returns<JobTemplate[]>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Template Pekerjaan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Dipakai AI Estimator untuk mencocokkan jenis pekerjaan dari foto/gambar ke pertanyaan &amp; daftar item standar.
        </p>
      </div>

      <form action={createTemplate} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <input name="name" required placeholder="Nama template (mis. Pondasi Batu Kali)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="keywords" placeholder="Kata kunci, pisah koma" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <input name="description" placeholder="Deskripsi (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
          Buat Template
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(templates ?? []).length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Belum ada template.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(templates ?? []).map((t) => (
              <li key={t.id}>
                <Link href={`/templates/${t.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{t.name}</p>
                    {t.keywords.length > 0 && (
                      <p className="text-xs text-slate-400">{t.keywords.join(', ')}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{t.owner_id ? 'milikmu' : 'referensi bersama'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

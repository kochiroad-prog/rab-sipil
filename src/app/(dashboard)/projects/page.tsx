import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Project[]>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Proyek</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Proyek Baru
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!projects || projects.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Belum ada proyek. Buat proyek pertamamu.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Nama Proyek</th>
                <th className="px-5 py-3 font-medium">Klien</th>
                <th className="px-5 py-3 font-medium">Lokasi</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.client_name ?? '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{p.location ?? '-'}</td>
                  <td className="px-5 py-3 capitalize text-slate-600">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

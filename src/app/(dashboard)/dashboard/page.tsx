import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<Project[]>()

  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Halo, {user?.user_metadata?.full_name ?? user?.email}
        </h1>
        <p className="mt-1 text-slate-500">Ringkasan proyek RAB kamu.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Proyek</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalProjects ?? 0}</p>
        </div>
        <Link
          href="/projects/new"
          className="flex flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-white p-5 hover:border-slate-400"
        >
          <p className="text-sm font-medium text-slate-900">+ Buat Proyek Baru</p>
          <p className="mt-1 text-sm text-slate-500">Mulai hitung RAB proyek baru</p>
        </Link>
        <Link
          href="/ahsp"
          className="flex flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-white p-5 hover:border-slate-400"
        >
          <p className="text-sm font-medium text-slate-900">Database AHSP</p>
          <p className="mt-1 text-sm text-slate-500">Kelola referensi harga satuan</p>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Proyek Terbaru</h2>
          <Link href="/projects" className="text-sm text-slate-600 underline">
            Lihat semua
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!projects || projects.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Belum ada proyek.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <span className="text-sm capitalize text-slate-500">{p.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

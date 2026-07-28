import Link from 'next/link'
import { Building2, FileClock, FolderKanban, ListChecks, Package, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types/database'

const STATUS_LABEL: Record<Project['status'], string> = {
  draft: 'Draft',
  active: 'Berjalan',
  done: 'Selesai',
  archived: 'Diarsipkan',
}

const STATUS_BADGE: Record<Project['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-blue-50 text-blue-700',
  done: 'bg-green-50 text-green-700',
  archived: 'bg-slate-100 text-slate-500',
}

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

  const { count: activeProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: draftProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Halo, {user?.user_metadata?.full_name ?? user?.email}
        </h1>
        <p className="mt-1 text-slate-500">Ringkasan proyek RAB kamu.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 text-slate-500">
            <FolderKanban size={16} />
            <p className="text-sm">Total Proyek</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalProjects ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 text-slate-500">
            <Building2 size={16} />
            <p className="text-sm">Proyek Berjalan</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{activeProjects ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 text-slate-500">
            <FileClock size={16} />
            <p className="text-sm">Draft</p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{draftProjects ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/projects/new"
          className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-5 hover:border-blue-400 hover:bg-blue-50/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Plus size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Buat Proyek Baru</p>
            <p className="mt-0.5 text-sm text-slate-500">Mulai hitung RAB proyek baru</p>
          </div>
        </Link>
        <Link
          href="/ahsp"
          className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-5 hover:border-blue-400 hover:bg-blue-50/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <ListChecks size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Database AHSP</p>
            <p className="mt-0.5 text-sm text-slate-500">Kelola referensi harga satuan</p>
          </div>
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Proyek Terbaru</h2>
          <Link href="/projects" className="text-sm text-blue-700 hover:underline">
            Lihat semua
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {!projects || projects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <Package size={28} className="text-slate-300" />
              <p className="text-sm text-slate-500">Belum ada proyek. Yuk buat yang pertama.</p>
              <Link href="/projects/new" className="text-sm font-medium text-blue-700 hover:underline">
                Buat proyek baru
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{p.name}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
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

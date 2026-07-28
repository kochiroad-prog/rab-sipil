import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '../(auth)/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-semibold text-slate-900">
            Estimator Sipil &amp; Konstruksi
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/projects" className="text-slate-600 hover:text-slate-900">
              Proyek
            </Link>
            <Link href="/ahsp" className="text-slate-600 hover:text-slate-900">
              Database AHSP
            </Link>
            <Link href="/materials" className="text-slate-600 hover:text-slate-900">
              Material
            </Link>
            <Link href="/templates" className="text-slate-600 hover:text-slate-900">
              Template
            </Link>
            <Link href="/labours" className="text-slate-600 hover:text-slate-900">
              Tenaga Kerja
            </Link>
            <span className="text-slate-400">{user?.email}</span>
            <form action={logout}>
              <button className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100">
                Keluar
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}

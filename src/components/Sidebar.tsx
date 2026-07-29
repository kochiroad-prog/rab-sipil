'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Package,
  LayoutTemplate,
  Users,
  Ruler,
  Truck,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Proyek', icon: Building2 },
  { href: '/ahsp', label: 'Database AHSP', icon: ListChecks },
  { href: '/materials', label: 'Material', icon: Package },
  { href: '/suppliers', label: 'Supplier', icon: Truck },
  { href: '/volume-recipes', label: 'Resep Volume', icon: Ruler },
  { href: '/templates', label: 'Template', icon: LayoutTemplate },
  { href: '/labours', label: 'Tenaga Kerja', icon: Users },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-white/15 font-medium text-white'
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({
  userEmail,
  logoutAction,
}: {
  userEmail?: string | null
  logoutAction: () => void
}) {
  return (
    <div className="mt-auto border-t border-white/10 px-4 pt-4">
      <p className="truncate text-xs text-blue-100">{userEmail}</p>
      <form action={logoutAction}>
        <button className="mt-2 flex items-center gap-2 text-sm text-blue-100 hover:text-white">
          <LogOut size={16} strokeWidth={1.75} />
          Keluar
        </button>
      </form>
    </div>
  )
}

export default function Sidebar({
  userEmail,
  logoutAction,
}: {
  userEmail?: string | null
  logoutAction: () => void
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#0c447c] px-4 py-3 text-white md:hidden">
        <span className="font-semibold">Estimator Sipil</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="rounded-md p-1.5 hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-[#0c447c] py-4">
            <div className="flex items-center justify-between px-4 pb-4">
              <span className="font-semibold text-white">Estimator Sipil</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="rounded-md p-1.5 text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <UserFooter userEmail={userEmail} logoutAction={logoutAction} />
          </div>
        </div>
      )}

      <aside className="hidden shrink-0 flex-col bg-[#0c447c] py-4 md:flex md:w-60">
        <div className="px-4 pb-4">
          <span className="text-base font-semibold text-white">Estimator Sipil</span>
          <p className="text-xs text-blue-200">Konstruksi &amp; sipil</p>
        </div>
        <NavLinks pathname={pathname} onNavigate={() => {}} />
        <UserFooter userEmail={userEmail} logoutAction={logoutAction} />
      </aside>
    </>
  )
}

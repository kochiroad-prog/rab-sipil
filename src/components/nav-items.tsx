import type { ElementType } from 'react'
import {
  LayoutDashboard,
  Building2,
  ListChecks,
  Package,
  LayoutTemplate,
  Users,
  Ruler,
  Truck,
  HardHat,
  Settings,
  FileText,
  Wallet,
  Banknote,
  BarChart3,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

export type NavItem = { href: string; label: string; icon: ElementType }

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Utama',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/projects', label: 'Proyek', icon: Building2 },
      { href: '/estimator', label: 'AI Estimator', icon: Sparkles },
    ],
  },
  {
    group: 'Database',
    items: [
      { href: '/ahsp', label: 'Database AHSP', icon: ListChecks },
      { href: '/materials', label: 'Material', icon: Package },
      { href: '/suppliers', label: 'Supplier', icon: Truck },
      { href: '/labours', label: 'Tenaga Kerja', icon: Users },
      { href: '/templates', label: 'Template', icon: LayoutTemplate },
      { href: '/volume-recipes', label: 'Resep Volume', icon: Ruler },
    ],
  },
  {
    group: 'Operasional',
    items: [
      { href: '/equipment', label: 'Peralatan', icon: HardHat },
      { href: '/purchasing/po', label: 'PO & Invoice', icon: FileText },
      { href: '/purchasing/pembayaran', label: 'Pembayaran', icon: Wallet },
      { href: '/upah-kerja', label: 'Upah Kerja', icon: Banknote },
      { href: '/laporan', label: 'Laporan', icon: BarChart3 },
    ],
  },
  {
    group: 'Pengaturan',
    items: [
      { href: '/settings/company', label: 'Profil Perusahaan', icon: Settings },
      { href: '/settings/whatsapp', label: 'Notifikasi WA', icon: MessageSquare },
    ],
  },
]

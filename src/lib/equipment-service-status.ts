export type ServiceStatus = 'aman' | 'segera' | 'terlambat' | 'belum'

export function computeServiceStatus(nextServiceDate: string | null, today: Date = new Date()): {
  status: ServiceStatus
  daysDiff: number | null
} {
  if (!nextServiceDate) return { status: 'belum', daysDiff: null }

  const next = new Date(nextServiceDate + 'T00:00:00')
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00')
  const diffMs = next.getTime() - t.getTime()
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (daysDiff < 0) return { status: 'terlambat', daysDiff }
  if (daysDiff <= 14) return { status: 'segera', daysDiff }
  return { status: 'aman', daysDiff }
}

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  aman: 'Aman',
  segera: 'Segera Servis',
  terlambat: 'Terlambat Servis',
  belum: 'Belum Dijadwalkan',
}

export const SERVICE_STATUS_BADGE: Record<ServiceStatus, string> = {
  aman: 'bg-emerald-50 text-emerald-700',
  segera: 'bg-amber-50 text-amber-700',
  terlambat: 'bg-red-50 text-red-700',
  belum: 'bg-slate-100 text-slate-500',
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Project, PurchaseOrder } from '@/types/database'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  ordered: 'Dipesan',
  invoiced: 'Invoiced',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
}

const STATUS_BADGE: Record<string, string> = {
  ordered: 'bg-slate-100 text-slate-600',
  invoiced: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

export default async function PoInvoicePage() {
  const supabase = await createClient()

  const { data: posRaw } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<PurchaseOrder[]>()
  const pos = posRaw ?? []

  const projectIds = Array.from(new Set(pos.map((p) => p.project_id)))
  let projectsById = new Map<string, Project>()
  if (projectIds.length > 0) {
    const { data: projectsRaw } = await supabase.from('projects').select('*').in('id', projectIds).returns<Project[]>()
    projectsById = new Map((projectsRaw ?? []).map((p) => [p.id, p]))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">PO &amp; Invoice</h1>
        <p className="mt-1 text-sm text-slate-500">
          Semua Purchase Order lintas proyek. Buat PO baru dari halaman Purchasing tiap proyek.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">No. PO</th>
              <th className="px-4 py-3 font-medium">Proyek</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 text-right font-medium">Nilai</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada PO.</td>
              </tr>
            )}
            {pos.map((po) => {
              const project = projectsById.get(po.project_id)
              return (
                <tr key={po.id}>
                  <td className="px-4 py-3 text-slate-900">{po.po_number}</td>
                  <td className="px-4 py-3 text-slate-600">{project?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{po.supplier_name ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(po.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[po.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[po.status] ?? po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/projects/${po.project_id}/purchasing/po/${po.id}`} className="text-xs text-blue-700 hover:underline">
                      Detail
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

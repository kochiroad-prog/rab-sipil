import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Project, RabItem, PurchaseOrder, PurchaseOrderItem, ManpowerSpk, LabourTermin } from '@/types/database'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Aktif',
  done: 'Selesai',
  archived: 'Arsip',
}

export default async function LaporanPage() {
  const supabase = await createClient()

  const { data: projectsRaw } = await supabase.from('projects').select('*').order('name').returns<Project[]>()
  const projects = projectsRaw ?? []

  const { data: rabItemsRaw } = await supabase.from('rab_items').select('*').returns<RabItem[]>()
  const rabItems = rabItemsRaw ?? []

  const { data: posRaw } = await supabase.from('purchase_orders').select('*').eq('status', 'paid').returns<PurchaseOrder[]>()
  const paidPOs = posRaw ?? []

  const poIds = paidPOs.map((p) => p.id)
  let poItems: PurchaseOrderItem[] = []
  if (poIds.length > 0) {
    const { data: itemsRaw } = await supabase
      .from('purchase_order_items')
      .select('*')
      .in('po_id', poIds)
      .returns<PurchaseOrderItem[]>()
    poItems = itemsRaw ?? []
  }

  const { data: spksRaw } = await supabase.from('manpower_spk').select('*').returns<ManpowerSpk[]>()
  const spks = spksRaw ?? []
  const spkProjectById = new Map(spks.map((s) => [s.id, s.project_id]))

  let paidTermins: LabourTermin[] = []
  if (spks.length > 0) {
    const { data: terminsRaw } = await supabase
      .from('labour_termins')
      .select('*')
      .eq('status', 'paid')
      .in('spk_id', spks.map((s) => s.id))
      .returns<LabourTermin[]>()
    paidTermins = terminsRaw ?? []
  }

  const rows = projects.map((p) => {
    const items = rabItems.filter((it) => it.project_id === p.id)
    const subtotal = items.reduce((s, it) => s + it.volume * it.unit_price, 0)
    const nilaiKontrak = subtotal * (1 + p.ppn_percent / 100)

    const realisasiMaterial = paidPOs.filter((po) => po.project_id === p.id).reduce((s, po) => s + po.total_amount, 0)
    const realisasiUpah = paidTermins
      .filter((t) => t.spk_id && spkProjectById.get(t.spk_id) === p.id)
      .reduce((s, t) => s + t.amount, 0)

    const totalRealisasi = realisasiMaterial + realisasiUpah
    const profit = nilaiKontrak - totalRealisasi
    const marginPct = nilaiKontrak > 0 ? (profit / nilaiKontrak) * 100 : 0

    return { project: p, nilaiKontrak, realisasiMaterial, realisasiUpah, totalRealisasi, profit, marginPct }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      nilaiKontrak: acc.nilaiKontrak + r.nilaiKontrak,
      totalRealisasi: acc.totalRealisasi + r.totalRealisasi,
      profit: acc.profit + r.profit,
    }),
    { nilaiKontrak: 0, totalRealisasi: 0, profit: 0 }
  )
  const avgMargin = totals.nilaiKontrak > 0 ? (totals.profit / totals.nilaiKontrak) * 100 : 0

  const materialTotals = new Map<string, number>()
  for (const it of poItems) {
    materialTotals.set(it.material_name, (materialTotals.get(it.material_name) ?? 0) + it.total)
  }
  const topMaterials = Array.from(materialTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Laporan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Nilai kontrak (dari RAB) vs realisasi biaya (material + upah yang sudah dibayar) per proyek.
          </p>
        </div>
        <a
          href="/api/laporan-export"
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Export Excel
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">Total Nilai Kontrak</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatRupiah(totals.nilaiKontrak)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">Total Realisasi Biaya</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatRupiah(totals.totalRealisasi)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">Total Profit</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatRupiah(totals.profit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">Margin Rata-rata</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{avgMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Per Proyek</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Proyek</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Nilai Kontrak</th>
                <th className="px-4 py-3 text-right font-medium">Realisasi</th>
                <th className="px-4 py-3 text-right font-medium">Profit</th>
                <th className="px-4 py-3 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada proyek.</td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.project.id}>
                  <td className="px-4 py-3 text-slate-900">
                    <Link href={`/projects/${r.project.id}`} className="hover:underline">{r.project.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{STATUS_LABEL[r.project.status] ?? r.project.status}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(r.nilaiKontrak)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(r.totalRealisasi)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatRupiah(r.profit)}
                  </td>
                  <td className={`px-4 py-3 text-right ${r.marginPct < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {r.marginPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {topMaterials.length > 0 && (
        <div>
          <h3 className="mb-2 font-medium text-slate-900">Top Material Terbeli (Lintas Proyek)</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 text-right font-medium">Total Belanja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topMaterials.map(([name, total]) => (
                  <tr key={name}>
                    <td className="px-4 py-3 text-slate-900">{name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

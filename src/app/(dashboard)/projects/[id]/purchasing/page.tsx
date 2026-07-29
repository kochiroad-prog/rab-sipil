import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, RabItem, AhspComponent, Material, PurchaseOrder } from '@/types/database'
import { aggregateMaterials } from '@/lib/takeoff-sipil'
import PurchasingTable from '@/components/PurchasingTable'
import BuatPOPanel from '@/components/BuatPOPanel'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const PO_STATUS_LABEL: Record<string, string> = {
  ordered: 'Dipesan',
  invoiced: 'Invoiced',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
}

const PO_STATUS_BADGE: Record<string, string> = {
  ordered: 'bg-slate-100 text-slate-600',
  invoiced: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

export default async function PurchasingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: rabItems } = await supabase
    .from('rab_items')
    .select('*')
    .eq('project_id', id)
    .returns<RabItem[]>()

  const ahspItemIds = Array.from(
    new Set((rabItems ?? []).map((it) => it.ahsp_item_id).filter((v): v is string => !!v))
  )

  let componentsByAhspItem = new Map<string, AhspComponent[]>()
  if (ahspItemIds.length > 0) {
    const { data: components } = await supabase
      .from('ahsp_components')
      .select('*')
      .in('ahsp_item_id', ahspItemIds)
      .eq('component_type', 'material')
      .returns<AhspComponent[]>()

    componentsByAhspItem = new Map()
    for (const c of components ?? []) {
      const arr = componentsByAhspItem.get(c.ahsp_item_id) ?? []
      arr.push(c)
      componentsByAhspItem.set(c.ahsp_item_id, arr)
    }
  }

  const { data: materialsRaw } = await supabase
    .from('materials')
    .select('*, suppliers(id, name)')
    .returns<(Material & { suppliers: { id: string; name: string } | null })[]>()
  const materials = materialsRaw ?? []

  const supplierByMaterialId: Record<string, { id: string | null; name: string }> = {}
  for (const m of materials) {
    if (m.suppliers) supplierByMaterialId[m.id] = { id: m.suppliers.id, name: m.suppliers.name }
  }

  const rows = aggregateMaterials(rabItems ?? [], componentsByAhspItem, materials)
  const unmatchedCount = rows.filter((r) => !r.matched).length

  const { data: posRaw } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .returns<PurchaseOrder[]>()
  const purchaseOrders = posRaw ?? []

  const { data: warehouse } = await supabase
    .from('project_warehouses')
    .select('id')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const stockByMaterialId: Record<string, number> = {}
  if (warehouse) {
    const { data: stockRaw } = await supabase
      .from('warehouse_stock')
      .select('material_id, qty')
      .eq('warehouse_id', warehouse.id)
    for (const s of stockRaw ?? []) {
      stockByMaterialId[s.material_id] = s.qty
    }
  }

  const totalBelanja = purchaseOrders.filter((p) => p.status !== 'cancelled').reduce((s, p) => s + p.total_amount, 0)
  const totalDibayar = purchaseOrders.filter((p) => p.status === 'paid').reduce((s, p) => s + p.total_amount, 0)
  const sisaBelanja = totalBelanja - totalDibayar

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/projects/${id}`} className="text-sm text-slate-500 hover:underline">
            &larr; Kembali ke {project.name}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Rekap Kebutuhan Beli (Purchasing)</h1>
          <p className="mt-1 text-sm text-slate-500">
            Diagregasi dari komposisi AHSP bahan × volume item RAB, dibulatkan ke satuan beli utuh (sak/lembar/batang/dll).
            Item RAB tanpa referensi AHSP atau AHSP tanpa komposisi bahan tidak ikut terhitung di sini.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/projects/${id}/warehouse`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Gudang Proyek
          </Link>
          {rows.length > 0 && (
            <a
              href={`/api/projects/${id}/purchasing-export`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Export Excel
            </a>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Belum ada kebutuhan bahan yang bisa dihitung. Pastikan item RAB memakai referensi AHSP yang
          sudah diisi komposisi bahannya (halaman Database AHSP → detail item → Tambah Komposisi).
        </div>
      ) : (
        <>
          {unmatchedCount > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {unmatchedCount} bahan belum cocok / satuan komponen AHSP berbeda dari satuan Material DB — harga &amp; satuan beli perlu diisi/dikonversi manual.
              Cek kolom &quot;Kebutuhan&quot; (satuan asli AHSP) vs satuan di halaman <Link href="/materials" className="underline">Database Material</Link>, lalu samakan satuannya (mis. ubah satuan komponen di AHSP jadi sak, bukan kg).
            </p>
          )}
          <PurchasingTable rows={rows} stockByMaterialId={stockByMaterialId} />

          <BuatPOPanel projectId={id} rows={rows} supplierByMaterialId={supplierByMaterialId} />
        </>
      )}

      {purchaseOrders.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium text-slate-900">PO &amp; Invoice</h3>
            <p className="text-xs text-slate-500">
              Total Belanja {formatRupiah(totalBelanja)} · Dibayar {formatRupiah(totalDibayar)} · Sisa {formatRupiah(sisaBelanja)}
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">No. PO</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 text-right font-medium">Nilai</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="px-4 py-3 text-slate-900">
                      <Link href={`/projects/${id}/purchasing/po/${po.id}`} className="hover:underline">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{po.supplier_name ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(po.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${PO_STATUS_BADGE[po.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {PO_STATUS_LABEL[po.status] ?? po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/projects/${id}/purchasing/po/${po.id}`} className="text-xs text-blue-700 hover:underline">
                        Detail
                      </Link>
                    </td>
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

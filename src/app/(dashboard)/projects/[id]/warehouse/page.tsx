import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Material, Project, ProjectWarehouse } from '@/types/database'
import { fetchAllRows } from '@/lib/supabase-paginate'
import {
  updateWarehouseSettings,
  recordStockIn,
  recordStockOut,
} from './actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type StockRow = { id: string; material_id: string; qty: number; avg_cost: number; material: { name: string; unit: string } | null }
type TxRow = {
  id: string
  type: string
  qty: number
  unit_price: number
  reference: string | null
  note: string | null
  created_at: string
  material: { name: string; unit: string } | null
}

export default async function ProjectWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let { data: warehouse } = await supabase
    .from('project_warehouses')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<ProjectWarehouse>()

  if (!warehouse && user) {
    const { data: created } = await supabase
      .from('project_warehouses')
      .insert({ owner_id: user.id, project_id: id, name: 'Direksi Keet' })
      .select('*')
      .single<ProjectWarehouse>()
    warehouse = created ?? null
  }

  if (!warehouse) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Gagal memuat/membuat gudang proyek.
      </div>
    )
  }

  const { data: stockRaw } = await supabase
    .from('warehouse_stock')
    .select('id, material_id, qty, avg_cost, material:materials(name, unit)')
    .eq('warehouse_id', warehouse.id)
    .gt('qty', 0)
    .returns<StockRow[]>()
  const stock = stockRaw ?? []

  const { data: txRaw } = await supabase
    .from('warehouse_transactions')
    .select('id, type, qty, unit_price, reference, note, created_at, material:materials(name, unit)')
    .eq('warehouse_id', warehouse.id)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<TxRow[]>()
  const transactions = txRaw ?? []

  const materials = await fetchAllRows<Material>((from, to) =>
    supabase.from('materials').select('*').order('name').range(from, to).returns<Material[]>(),
  )

  const totalStockValue = stock.reduce((s, r) => s + r.qty * r.avg_cost, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-slate-500 hover:underline">
          &larr; Kembali ke {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Gudang Proyek</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lokasi penyimpanan material di lapangan (mis. direksi keet). Terpisah per proyek — tidak digabung lintas proyek lain.
        </p>
      </div>

      <form action={updateWarehouseSettings} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <input type="hidden" name="id" value={warehouse.id} />
        <input type="hidden" name="project_id" value={id} />
        <input name="name" defaultValue={warehouse.name} placeholder="Nama gudang" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <input name="address" defaultValue={warehouse.address ?? ''} placeholder="Alamat/lokasi (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 sm:col-span-1">
          Simpan
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form action={recordStockIn} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-medium text-slate-900">Barang Masuk</h3>
          <input type="hidden" name="warehouse_id" value={warehouse.id} />
          <input type="hidden" name="project_id" value={id} />
          <select name="material_id" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">-- Pilih material --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input name="qty" type="number" step="0.01" required placeholder="Jumlah" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input name="unit_price" type="number" step="1" placeholder="Harga satuan" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <input name="reference" placeholder="Referensi (mis. no. PO, opsional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="note" placeholder="Catatan (opsional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Catat Masuk
          </button>
        </form>

        <form action={recordStockOut} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-medium text-slate-900">Barang Keluar</h3>
          <input type="hidden" name="warehouse_id" value={warehouse.id} />
          <input type="hidden" name="project_id" value={id} />
          <select name="material_id" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">-- Pilih material --</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
          <input name="qty" type="number" step="0.01" required placeholder="Jumlah dipakai" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="reference" placeholder="Referensi (mis. untuk pekerjaan apa)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="note" placeholder="Catatan (opsional)" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Catat Keluar
          </button>
        </form>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium text-slate-900">Stok Saat Ini</h3>
          <p className="text-xs text-slate-500">Nilai stok: {formatRupiah(totalStockValue)}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Harga Rata-rata</th>
                <th className="px-4 py-3 text-right font-medium">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stock.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Belum ada stok tersimpan.</td>
                </tr>
              )}
              {stock.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-slate-900">{s.material?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.qty} {s.material?.unit ?? ''}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(s.avg_cost)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(s.qty * s.avg_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Riwayat Transaksi</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 font-medium">Material</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Referensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada transaksi.</td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-slate-500">{new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${t.type === 'masuk' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {t.type === 'masuk' ? 'Masuk' : 'Keluar'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{t.material?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{t.qty} {t.material?.unit ?? ''}</td>
                  <td className="px-4 py-3 text-slate-500">{t.reference ?? t.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

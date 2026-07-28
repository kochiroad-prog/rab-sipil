import { createClient } from '@/lib/supabase/server'
import type { AhspItem, AhspCategory } from '@/types/database'
import { addAhspItem, deleteAhspItem } from './actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default async function AhspPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: categories } = await supabase
    .from('ahsp_categories')
    .select('*')
    .order('sort_order')
    .returns<AhspCategory[]>()

  const { data: items } = await supabase
    .from('ahsp_items')
    .select('*, ahsp_categories(name)')
    .order('name')
    .returns<(AhspItem & { ahsp_categories: AhspCategory | null })[]>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Database AHSP</h1>
        <p className="mt-1 text-sm text-slate-500">
          Referensi Analisa Harga Satuan Pekerjaan. Item tanpa pemilik = data referensi bersama;
          item yang kamu tambahkan hanya terlihat olehmu.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Tambah Item AHSP</h3>
        <form action={addAhspItem} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input name="code" placeholder="Kode" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <select name="category_id" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" defaultValue="">
            <option value="">-- Kategori --</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="name" required placeholder="Nama pekerjaan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="unit" required placeholder="Satuan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="unit_price" type="number" step="1" required placeholder="Harga satuan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Nama Pekerjaan</th>
              <th className="px-4 py-3 font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada data AHSP.</td>
              </tr>
            )}
            {(items ?? []).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-slate-500">{it.code ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{it.ahsp_categories?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-900">{it.name}</td>
                <td className="px-4 py-3 text-slate-600">{it.unit}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(it.unit_price)}</td>
                <td className="px-4 py-3 text-right">
                  {it.owner_id === user?.id && (
                    <form action={deleteAhspItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

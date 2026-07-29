import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/types/database'
import { addSupplier, deleteSupplier } from './actions'

export default async function SuppliersPage() {
  const supabase = await createClient()

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')
    .returns<Supplier[]>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Database Supplier</h1>
        <p className="mt-1 text-sm text-slate-500">
          Data toko/supplier material. Bisa ditag ke material di Database Material.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Tambah Supplier</h3>
        <form action={addSupplier} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <input name="name" required placeholder="Nama supplier/toko" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="city" placeholder="Kota" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="phone" placeholder="Telepon" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Tambah
          </button>
          <input name="maps_link" placeholder="Link Google Maps (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="notes" placeholder="Catatan (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kota</th>
              <th className="px-4 py-3 font-medium">Telepon</th>
              <th className="px-4 py-3 font-medium">Catatan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(suppliers ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada supplier.</td>
              </tr>
            )}
            {(suppliers ?? []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-slate-900">
                  {s.name}
                  {s.maps_link && (
                    <a href={s.maps_link} target="_blank" rel="noreferrer" className="ml-2 text-xs text-blue-700 underline">
                      Peta
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.city ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{s.phone ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">{s.notes ?? '-'}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteSupplier}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-xs text-red-600 hover:underline">Hapus</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

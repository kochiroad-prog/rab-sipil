import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Material } from '@/types/database'
import MaterialForm from '@/components/MaterialForm'
import { deleteMaterial } from './actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const CATEGORY_LABEL: Record<string, string> = {
  semen: 'Semen',
  pasir: 'Pasir',
  kerikil: 'Kerikil/Split',
  besi: 'Besi',
  kayu: 'Kayu',
  bata: 'Bata/Batako',
  keramik: 'Keramik/Ubin',
  cat: 'Cat',
  cat_finishing: 'Finishing Lain',
  pipa: 'Pipa',
  kabel: 'Kabel',
  lainnya: 'Lainnya',
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let query = supabase.from('materials').select('*').order('name')
  if (category) query = query.eq('category', category)
  const { data: materials } = await query.returns<Material[]>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Database Material</h1>
        <p className="mt-1 text-sm text-slate-500">
          Katalog bahan konstruksi (semen, pasir, besi, bata, dst) untuk komposisi AHSP & take-off.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/materials"
          className={`rounded-md px-3 py-1.5 text-sm ${!category ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
        >
          Semua
        </Link>
        {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
          <Link
            key={key}
            href={`/materials?category=${key}`}
            className={`rounded-md px-3 py-1.5 text-sm ${category === key ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <MaterialForm />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Harga</th>
              <th className="px-4 py-3 text-right font-medium">Waste</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(materials ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada material.</td>
              </tr>
            )}
            {(materials ?? []).map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-slate-500">{CATEGORY_LABEL[m.category] ?? m.category}</td>
                <td className="px-4 py-3 text-slate-900">
                  {m.name}
                  {m.brand ? <span className="ml-1 text-xs text-slate-400">({m.brand})</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(m.price)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{m.waste_pct}%</td>
                <td className="px-4 py-3 text-right">
                  {m.owner_id === user?.id && (
                    <form action={deleteMaterial}>
                      <input type="hidden" name="id" value={m.id} />
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

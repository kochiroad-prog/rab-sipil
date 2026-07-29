import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Material, Supplier } from '@/types/database'
import MaterialForm from '@/components/MaterialForm'
import MaterialsBrowser from '@/components/MaterialsBrowser'

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

  let query = supabase.from('materials').select('*, suppliers(name)').order('name')
  if (category) query = query.eq('category', category)
  const { data: materialsRaw } = await query.returns<(Material & { suppliers: { name: string } | null })[]>()
  const materials = materialsRaw ?? []

  const { data: suppliers } = await supabase.from('suppliers').select('*').order('name').returns<Supplier[]>()

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

      <MaterialForm suppliers={suppliers ?? []} />

      <MaterialsBrowser materials={materials} userId={user?.id} />
    </div>
  )
}

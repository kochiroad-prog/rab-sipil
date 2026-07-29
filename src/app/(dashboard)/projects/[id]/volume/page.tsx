import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, StructuralElement, VolumeGenericEntry } from '@/types/database'
import VolumeElementForm from '@/components/VolumeElementForm'
import VolumeGenericForm, { type RecipeWithItems } from '@/components/VolumeGenericForm'
import {
  deleteStructuralElement,
  sendElementToRab,
  deleteVolumeGenericEntry,
  sendVolumeGenericEntryToRab,
} from './actions'

const TYPE_LABEL: Record<string, string> = {
  kolom: 'Kolom',
  balok: 'Balok',
  sloof: 'Sloof',
  plat: 'Plat Lantai',
}

export default async function VolumePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: elements } = await supabase
    .from('structural_elements')
    .select('*')
    .eq('project_id', id)
    .order('sort_order')
    .order('created_at')
    .returns<StructuralElement[]>()

  const list = elements ?? []
  const totals = list.reduce(
    (acc, el) => ({
      beton: acc.beton + el.volume_beton_m3,
      bekisting: acc.bekisting + el.volume_bekisting_m2,
      besi: acc.besi + el.berat_besi_kg,
    }),
    { beton: 0, bekisting: 0, besi: 0 }
  )

  const { data: recipesRaw } = await supabase
    .from('volume_recipes')
    .select('*, volume_recipe_items(*)')
    .order('sort_order')
    .order('sort_order', { referencedTable: 'volume_recipe_items' })

  const recipes: RecipeWithItems[] = (recipesRaw ?? []).map((r) => ({
    ...r,
    items: (r as unknown as { volume_recipe_items: RecipeWithItems['items'] }).volume_recipe_items ?? [],
  }))

  const { data: genericEntries } = await supabase
    .from('volume_generic_entries')
    .select('*')
    .eq('project_id', id)
    .order('sort_order')
    .order('created_at')
    .returns<VolumeGenericEntry[]>()

  const genericList = genericEntries ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-slate-500 hover:underline">
          &larr; Kembali ke {project.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Backup Volume</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hitung volume beton, bekisting & kebutuhan besi dari dimensi elemen struktur.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Volume Beton</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totals.beton.toFixed(3)} m³</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Bekisting</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totals.bekisting.toFixed(2)} m²</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Kebutuhan Besi</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totals.besi.toFixed(1)} kg</p>
        </div>
      </div>

      <VolumeElementForm projectId={id} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Jenis</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 text-right font-medium">Volume Beton</th>
              <th className="px-4 py-3 text-right font-medium">Bekisting</th>
              <th className="px-4 py-3 text-right font-medium">Besi</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Belum ada elemen struktur.
                </td>
              </tr>
            )}
            {list.map((el) => (
              <tr key={el.id}>
                <td className="px-4 py-3 text-slate-500">{el.section ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[el.element_type]}</td>
                <td className="px-4 py-3 text-slate-900">{el.name}</td>
                <td className="px-4 py-3 text-right text-slate-600">{el.volume_beton_m3.toFixed(3)} m³</td>
                <td className="px-4 py-3 text-right text-slate-600">{el.volume_bekisting_m2.toFixed(2)} m²</td>
                <td className="px-4 py-3 text-right text-slate-600">{el.berat_besi_kg.toFixed(1)} kg</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <form action={sendElementToRab}>
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="element_id" value={el.id} />
                      <button className="text-xs font-medium text-slate-700 hover:underline">Kirim ke RAB</button>
                    </form>
                    <form action={deleteStructuralElement}>
                      <input type="hidden" name="id" value={el.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Generator Volume Umum</h2>
          <Link href="/volume-recipes" className="text-sm text-blue-700 hover:underline">
            Kelola Resep &rarr;
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Untuk pekerjaan di luar kolom/balok/sloof/plat — pondasi, dinding, plesteran, lantai, dsb. Satu input
          dimensi menghasilkan beberapa baris RAB sekaligus sesuai resep.
        </p>
      </div>

      <VolumeGenericForm projectId={id} recipes={recipes} />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Resep</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 text-right font-medium">Volume Dasar</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {genericList.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Belum ada generator volume.
                </td>
              </tr>
            )}
            {genericList.map((en) => (
              <tr key={en.id}>
                <td className="px-4 py-3 text-slate-500">{en.section ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{en.recipe_name}</td>
                <td className="px-4 py-3 text-slate-900">{en.name}</td>
                <td className="px-4 py-3 text-right text-slate-600">{en.base_volume.toFixed(3)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <form action={sendVolumeGenericEntryToRab}>
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="entry_id" value={en.id} />
                      <button className="text-xs font-medium text-slate-700 hover:underline">Kirim ke RAB</button>
                    </form>
                    <form action={deleteVolumeGenericEntry}>
                      <input type="hidden" name="id" value={en.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

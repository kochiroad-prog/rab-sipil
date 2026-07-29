import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project, RabItem, AhspComponent, Material } from '@/types/database'
import { aggregateMaterials } from '@/lib/takeoff-sipil'
import PurchasingTable from '@/components/PurchasingTable'

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

  const { data: materials } = await supabase.from('materials').select('*').returns<Material[]>()

  const rows = aggregateMaterials(rabItems ?? [], componentsByAhspItem, materials ?? [])
  const unmatchedCount = rows.filter((r) => !r.matched).length

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
        {rows.length > 0 && (
          <a
            href={`/api/projects/${id}/purchasing-export`}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Export Excel
          </a>
        )}
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
          <PurchasingTable rows={rows} />
        </>
      )}
    </div>
  )
}

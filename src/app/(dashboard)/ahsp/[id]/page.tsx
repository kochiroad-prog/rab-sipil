import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AhspItem, AhspComponent, Material } from '@/types/database'
import { addAhspComponent, deleteAhspComponent, syncAhspPriceFromComponents } from '../actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const TYPE_LABEL: Record<string, string> = { material: 'Bahan', labor: 'Upah', equipment: 'Alat' }

export default async function AhspItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase.from('ahsp_items').select('*').eq('id', id).single<AhspItem>()
  if (!item) notFound()

  const { data: components } = await supabase
    .from('ahsp_components')
    .select('*')
    .eq('ahsp_item_id', id)
    .order('component_type')
    .order('created_at')
    .returns<AhspComponent[]>()

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .order('name')
    .returns<Material[]>()

  const list = components ?? []
  const groups: Record<string, AhspComponent[]> = { material: [], labor: [], equipment: [] }
  for (const c of list) groups[c.component_type]?.push(c)

  const subtotal = list.reduce((s, c) => s + c.coefficient * c.unit_price, 0)
  const tkdnValue = list.reduce((s, c) => s + c.coefficient * c.unit_price * (c.tkdn_percent / 100), 0)
  const tkdnPercent = subtotal > 0 ? (tkdnValue / subtotal) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ahsp" className="text-sm text-slate-500 hover:underline">
          &larr; Kembali ke Database AHSP
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{item.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {item.code ?? '-'} · {item.unit} · Harga saat ini: {formatRupiah(item.unit_price)}
          {item.tkdn_percent > 0 ? ` · TKDN ${item.tkdn_percent}%` : ''}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-slate-900">Tambah Komposisi (Bahan / Upah / Alat)</h3>
        <form action={addAhspComponent} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-7">
          <input type="hidden" name="ahsp_item_id" value={item.id} />
          <select name="component_type" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" defaultValue="material">
            <option value="material">Bahan</option>
            <option value="labor">Upah</option>
            <option value="equipment">Alat</option>
          </select>
          <select name="material_id" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" defaultValue="">
            <option value="">-- Pilih Material (opsional) --</option>
            {(materials ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit}) - {formatRupiah(m.price)}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Nama (kalau tidak pilih material)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="unit" placeholder="Satuan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="coefficient" type="number" step="0.0001" required placeholder="Koefisien" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="unit_price" type="number" step="1" placeholder="Harga (kosongkan jika pilih material)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="tkdn_percent" type="number" step="0.1" min={0} max={100} placeholder="TKDN % (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Koefisien = jumlah kebutuhan bahan/upah/alat per satuan pekerjaan (mis. 0.24 m³ pasir per m³ pasangan batu kali).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Jenis</th>
              <th className="px-4 py-3 font-medium">Uraian</th>
              <th className="px-4 py-3 font-medium">Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Koefisien</th>
              <th className="px-4 py-3 text-right font-medium">Harga Satuan</th>
              <th className="px-4 py-3 text-right font-medium">Jumlah</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Belum ada komposisi. Harga AHSP masih diisi manual.
                </td>
              </tr>
            )}
            {(['material', 'labor', 'equipment'] as const).map((type) =>
              groups[type].map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[type]}</td>
                  <td className="px-4 py-3 text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{c.coefficient}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(c.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatRupiah(c.coefficient * c.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteAhspComponent}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="ahsp_item_id" value={item.id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {list.length > 0 && (
            <tfoot className="border-t border-slate-200 text-sm">
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-slate-500">Subtotal (bahan+upah+alat)</td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">{formatRupiah(subtotal)}</td>
                <td />
              </tr>
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-emerald-700">Estimasi TKDN komposisi</td>
                <td className="px-4 py-2 text-right font-medium text-emerald-700">{tkdnPercent.toFixed(1)}%</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {list.length > 0 && (
        <form action={syncAhspPriceFromComponents} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="ahsp_item_id" value={item.id} />
          <label className="text-sm text-slate-600">Overhead &amp; Profit %</label>
          <input
            name="overhead_percent"
            type="number"
            step="0.1"
            defaultValue={10}
            className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Terapkan ke Harga AHSP ({formatRupiah(subtotal)} + overhead)
          </button>
          <span className="text-xs text-slate-400">Menimpa harga manual item ini dengan hasil komposisi.</span>
        </form>
      )}
    </div>
  )
}

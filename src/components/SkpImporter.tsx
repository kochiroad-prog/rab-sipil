'use client'

import { useMemo, useRef, useState } from 'react'
import { Upload, Check } from 'lucide-react'
import { insertDraftItems } from '@/app/(dashboard)/projects/actions'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import { computeSkpTakeoff, isSkpFile, type SkpMaterialSummary, type SkpTakeoffResult } from '@/lib/skp-takeoff'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type GroupMode = 'material' | 'group'

type Row = SkpMaterialSummary & {
  include: boolean
  ahsp_item_id: string | null
  unit_price: number
  tkdn_percent: number
  volumeOverride: number | null
}

type ProjectOpt = { id: string; name: string }

export default function SkpImporter({
  projectId,
  projects,
  ahspItems,
}: {
  projectId?: string
  projects?: ProjectOpt[]
  ahspItems: AhspOption[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? '__none__')
  const activeProjectId = projectId ?? (selectedProjectId !== '__none__' ? selectedProjectId : null)

  const [fileName, setFileName] = useState('')
  const [materialRows, setMaterialRows] = useState<Row[]>([])
  const [groupRows, setGroupRows] = useState<Row[]>([])
  const [groupMode, setGroupMode] = useState<GroupMode>('material')
  const [meta, setMeta] = useState<Omit<SkpTakeoffResult, 'byMaterial' | 'byGroup'> | null>(null)
  const [section, setSection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)

  const rows = groupMode === 'material' ? materialRows : groupRows
  const setRows = groupMode === 'material' ? setMaterialRows : setGroupRows

  const estimatedTotal = useMemo(
    () =>
      rows
        .filter((r) => r.include)
        .reduce((sum, r) => sum + (r.volumeOverride ?? r.totalAreaM2) * r.unit_price, 0),
    [rows]
  )

  function toRows(list: SkpMaterialSummary[]): Row[] {
    return list.map((l) => ({
      ...l,
      include: true,
      ahsp_item_id: null,
      unit_price: 0,
      tkdn_percent: 0,
      volumeOverride: null,
    }))
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!isSkpFile(file)) {
      setError('File harus berformat .skp (file model SketchUp).')
      return
    }
    setSaveMsg(null)
    setError(null)
    setFileName(file.name)
    setSection(file.name.replace(/\.skp$/i, ''))
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const result = computeSkpTakeoff(buffer)
      setMaterialRows(toRows(result.byMaterial))
      setGroupRows(toRows(result.byGroup))
      setGroupMode('material')
      setMeta({
        definitionCount: result.definitionCount,
        meshCount: result.meshCount,
        materialCount: result.materialCount,
        sketchupVersion: result.sketchupVersion,
      })
      if (result.byMaterial.length === 0) {
        setError('Tidak ada permukaan yang terbaca dari file ini.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membaca file SketchUp')
      setMaterialRows([])
      setGroupRows([])
      setMeta(null)
    } finally {
      setParsing(false)
    }
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.material === key ? { ...r, ...patch } : r)))
  }

  function resetFile() {
    setFileName('')
    setMaterialRows([])
    setGroupRows([])
    setMeta(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSave() {
    if (!activeProjectId) {
      setError('Pilih proyek dulu sebelum menyimpan ke Rincian RAB.')
      return
    }
    const chosen = rows
      .filter((r) => r.include)
      .map((r) => ({
        name: r.material,
        unit: 'm2',
        volume: r.volumeOverride ?? r.totalAreaM2,
        ahsp_item_id: r.ahsp_item_id,
        unit_price: r.unit_price,
        tkdn_percent: r.tkdn_percent,
      }))
    if (chosen.length === 0) {
      setError(`Tidak ada ${groupMode === 'material' ? 'material' : 'grup'} yang dicentang untuk disimpan.`)
      return
    }
    setLoading(true)
    const { error: saveError } = await insertDraftItems(activeProjectId, section || null, chosen)
    setLoading(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setSaveMsg(`${chosen.length} item (dari model SketchUp) ditambahkan ke Rincian RAB.`)
    setFileName('')
    setMaterialRows([])
    setGroupRows([])
    setMeta(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Import Model SketchUp (.skp) — Eksperimental</h3>
      <p className="mt-1 text-sm text-slate-500">
        Luas dihitung langsung dari geometri 3D di file .skp, dikelompokkan per nama material (atap, lantai, keramik,
        dst) — karena nama grup/komponen di model 3D biasanya generik. Fitur ini masih baru, cek ulang angkanya
        sebelum dipakai final.
      </p>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saveMsg && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saveMsg}</p>}

      <div className="mt-4 space-y-3">
        {projects && projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600">Masukkan ke Proyek</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="__none__">Belum dikaitkan</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!!fileName || parsing}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
              fileName ? 'bg-emerald-600/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-70`}
          >
            {fileName ? <Check className="size-3.5" /> : <Upload className="size-3.5" />}
            {parsing ? 'Membaca file...' : fileName ? 'File Terupload' : 'Pilih File SKP'}
          </button>
          {fileName && !parsing && (
            <button type="button" onClick={resetFile} className="text-xs text-slate-500 hover:underline">
              Ganti file
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".skp"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />

        {meta && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {fileName} · SketchUp versi {meta.sketchupVersion} · {meta.meshCount} permukaan dari {meta.definitionCount}{' '}
            grup/komponen · {meta.materialCount} material terbaca. Satuan sudah otomatis dalam meter.
          </p>
        )}
      </div>

      {(materialRows.length > 0 || groupRows.length > 0) && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Kategori di RAB</label>
              <input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Kelompokkan berdasarkan</label>
              <div className="mt-1 flex overflow-hidden rounded-md border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setGroupMode('material')}
                  className={`px-3 py-1.5 ${groupMode === 'material' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Nama Material ({materialRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupMode('group')}
                  className={`border-l border-slate-300 px-3 py-1.5 ${groupMode === 'group' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Nama Grup/Komponen ({groupRows.length})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">{groupMode === 'material' ? 'Material' : 'Grup/Komponen'}</th>
                  <th className="px-3 py-2 text-right font-medium">Luas (m2)</th>
                  <th className="px-3 py-2 font-medium">Referensi AHSP</th>
                  <th className="px-3 py-2 text-right font-medium">Harga Satuan</th>
                  <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const volume = r.volumeOverride ?? r.totalAreaM2
                  return (
                    <tr key={r.material}>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(r.material, { include: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2 align-top font-medium text-slate-900">{r.material}</td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={volume}
                          onChange={(e) => updateRow(r.material, { volumeOverride: Number(e.target.value) })}
                          className={`w-28 rounded border px-2 py-1 text-right text-sm ${
                            r.volumeOverride !== null ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                          }`}
                        />
                        {r.volumeOverride !== null && (
                          <button
                            type="button"
                            onClick={() => updateRow(r.material, { volumeOverride: null })}
                            className="ml-1 text-[10px] text-slate-400 hover:underline"
                            title={`Kembalikan ke hasil hitung otomatis (${r.totalAreaM2.toFixed(2)})`}
                          >
                            reset
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <AhspCombobox
                          items={ahspItems}
                          placeholder="Cari AHSP..."
                          className="min-w-[220px]"
                          defaultSelected={ahspItems.find((a) => a.id === r.ahsp_item_id) ?? null}
                          onSelect={(picked) =>
                            updateRow(r.material, {
                              ahsp_item_id: picked?.id ?? null,
                              unit_price: picked?.unit_price ?? r.unit_price,
                              tkdn_percent: picked?.tkdn_percent ?? r.tkdn_percent,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          step="1"
                          value={r.unit_price}
                          onChange={(e) => updateRow(r.material, { unit_price: Number(e.target.value) })}
                          className="w-28 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right align-top font-medium text-slate-900">
                        {formatRupiah(volume * r.unit_price)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-slate-200">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right text-slate-500">Estimasi Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatRupiah(estimatedTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Masukkan ke Rincian RAB'}
          </button>
        </div>
      )}
    </div>
  )
}

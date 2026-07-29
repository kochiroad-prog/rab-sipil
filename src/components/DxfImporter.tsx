'use client'

import { useMemo, useRef, useState } from 'react'
import { Upload, Check } from 'lucide-react'
import { insertDraftItems } from '@/app/(dashboard)/projects/actions'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import { computeDxfTakeoff, isDxfFile, type DxfLayerSummary, type DxfUnitInfo } from '@/lib/dxf-takeoff'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type Basis = 'panjang' | 'luas'
type GroupMode = 'layer' | 'group'

type LayerRow = DxfLayerSummary & {
  include: boolean
  basis: Basis
  ahsp_item_id: string | null
  unit_price: number
  tkdn_percent: number
  volumeOverride: number | null
}

type ProjectOpt = { id: string; name: string }

export default function DxfImporter({
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

  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [unit, setUnit] = useState<DxfUnitInfo | null>(null)
  const [manualScale, setManualScale] = useState('')
  const [layerRows, setLayerRows] = useState<LayerRow[]>([])
  const [groupRows, setGroupRows] = useState<LayerRow[]>([])
  const [groupMode, setGroupMode] = useState<GroupMode>('layer')
  const [meta, setMeta] = useState<{ blockCount: number; nestedEntityCount: number; entityCount: number } | null>(null)
  const [section, setSection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const rows = groupMode === 'layer' ? layerRows : groupRows
  const setRows = groupMode === 'layer' ? setLayerRows : setGroupRows

  const estimatedTotal = useMemo(
    () =>
      rows
        .filter((r) => r.include)
        .reduce((sum, r) => {
          const vol = r.volumeOverride ?? (r.basis === 'luas' ? r.totalAreaM2 : r.totalLengthM)
          return sum + vol * r.unit_price
        }, 0),
    [rows]
  )

  function toRows(list: DxfLayerSummary[]): LayerRow[] {
    return list.map((l) => ({
      ...l,
      include: true,
      basis: l.totalAreaM2 > 0 ? 'luas' : 'panjang',
      ahsp_item_id: null,
      unit_price: 0,
      tkdn_percent: 0,
      volumeOverride: null,
    }))
  }

  function runParse(text: string, scaleOverride?: number) {
    try {
      const result = computeDxfTakeoff(text, scaleOverride)
      setUnit(result.unit)
      setMeta({ blockCount: result.blockCount, nestedEntityCount: result.nestedEntityCount, entityCount: result.entityCount })
      setLayerRows(toRows(result.layers))
      setGroupRows(toRows(result.groups))
      // Kalau layer nggak informatif (cuma 1, biasanya "0" — umum di file dari SketchUp),
      // langsung default ke pengelompokan per grup/block supaya user tidak cuma lihat 1 baris.
      setGroupMode(result.layers.length <= 1 && result.groups.length > 1 ? 'group' : 'layer')
      setError(null)
      if (result.layers.length === 0) {
        setError('Tidak ada garis/polyline/circle yang terbaca dari file ini (cek isinya, atau format bukan DXF ASCII).')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membaca file DXF')
      setLayerRows([])
      setGroupRows([])
      setMeta(null)
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!isDxfFile(file)) {
      setError('File harus berformat .dxf (ekspor dari AutoCAD atau SketchUp Pro: File > Export > DXF).')
      return
    }
    setSaveMsg(null)
    setFileName(file.name)
    setSection(file.name.replace(/\.dxf$/i, ''))
    const text = await file.text()
    setRawText(text)
    runParse(text)
  }

  function applyManualScale() {
    if (!rawText) return
    const n = Number(manualScale)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Isi angka skala yang valid, mis. 0.001 kalau file dalam mm.')
      return
    }
    runParse(rawText, n)
  }

  function updateRow(layer: string, patch: Partial<LayerRow>) {
    setRows((prev) => prev.map((r) => (r.layer === layer ? { ...r, ...patch } : r)))
  }

  function resetFile() {
    setRawText('')
    setFileName('')
    setUnit(null)
    setManualScale('')
    setLayerRows([])
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
        name: r.layer,
        unit: r.basis === 'luas' ? 'm2' : 'm1',
        volume: r.volumeOverride ?? (r.basis === 'luas' ? r.totalAreaM2 : r.totalLengthM),
        ahsp_item_id: r.ahsp_item_id,
        unit_price: r.unit_price,
        tkdn_percent: r.tkdn_percent,
      }))
    if (chosen.length === 0) {
      setError(`Tidak ada ${groupMode === 'layer' ? 'layer' : 'grup'} yang dicentang untuk disimpan.`)
      return
    }
    setLoading(true)
    const { error: saveError } = await insertDraftItems(activeProjectId, section || null, chosen)
    setLoading(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setSaveMsg(`${chosen.length} item (dari DXF) ditambahkan ke Rincian RAB.`)
    setRawText('')
    setFileName('')
    setUnit(null)
    setLayerRows([])
    setGroupRows([])
    setMeta(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Import File CAD (DXF) — Presisi</h3>
      <p className="mt-1 text-sm text-slate-500">
        Panjang & luas dihitung langsung dari koordinat garis di file (bukan tebakan AI). Cocok untuk gambar kerja
        yang sudah ada file CAD-nya (AutoCAD, atau SketchUp Pro: File &gt; Export &gt; 2D Graphic &gt; DXF).
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
            disabled={!!fileName}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
              fileName ? 'bg-emerald-600/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-70`}
          >
            {fileName ? <Check className="size-3.5" /> : <Upload className="size-3.5" />}
            {fileName ? 'File Terupload' : 'Pilih File DXF'}
          </button>
          {fileName && (
            <button type="button" onClick={resetFile} className="text-xs text-slate-500 hover:underline">
              Ganti file
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".dxf"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />

        {fileName && unit && (
          <p className="text-xs text-slate-500">
            {fileName} · satuan gambar: {unit.unitName}
            {!unit.detected && ' (tidak terbaca dari file — cek/isi skala manual di bawah bila hasil hitung terasa salah)'}
          </p>
        )}

        {meta && meta.nestedEntityCount > 0 && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
            {meta.entityCount} garis/bentuk terbaca, termasuk {meta.nestedEntityCount} yang tadinya tersembunyi di
            dalam {meta.blockCount} grup/block (mis. hasil ekspor SketchUp) — sekarang sudah ikut dihitung.
          </p>
        )}

        {rawText && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              Skala manual (1 unit gambar = ... meter):
            </label>
            <input
              value={manualScale}
              onChange={(e) => setManualScale(e.target.value)}
              placeholder="mis. 0.001 (mm)"
              className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={applyManualScale}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Hitung Ulang
            </button>
          </div>
        )}
      </div>

      {(layerRows.length > 0 || groupRows.length > 0) && (
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
                  onClick={() => setGroupMode('layer')}
                  className={`px-3 py-1.5 ${groupMode === 'layer' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Layer ({layerRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupMode('group')}
                  className={`border-l border-slate-300 px-3 py-1.5 ${groupMode === 'group' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Nama Grup/Block ({groupRows.length})
                </button>
              </div>
            </div>
          </div>
          {groupMode === 'layer' && layerRows.length <= 1 && (
            <p className="text-xs text-amber-600">
              Semua garis ada di 1 layer saja (umum kalau file diekspor dari SketchUp) — coba mode &quot;Nama
              Grup/Block&quot; supaya bisa dipilah lebih dari 1 baris.
            </p>
          )}

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">{groupMode === 'layer' ? 'Layer' : 'Grup/Block'}</th>
                  <th className="px-3 py-2 font-medium">Basis</th>
                  <th className="px-3 py-2 text-right font-medium">Volume</th>
                  <th className="px-3 py-2 font-medium">Referensi AHSP</th>
                  <th className="px-3 py-2 text-right font-medium">Harga Satuan</th>
                  <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const computedVolume = r.basis === 'luas' ? r.totalAreaM2 : r.totalLengthM
                  const volume = r.volumeOverride ?? computedVolume
                  return (
                    <tr key={r.layer}>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => updateRow(r.layer, { include: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2 align-top font-medium text-slate-900">{r.layer}</td>
                      <td className="px-3 py-2 align-top">
                        <select
                          value={r.basis}
                          onChange={(e) => updateRow(r.layer, { basis: e.target.value as Basis, volumeOverride: null })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="panjang" disabled={r.totalLengthM <= 0}>Panjang (m1)</option>
                          <option value="luas" disabled={r.totalAreaM2 <= 0}>Luas (m2)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <input
                          type="number"
                          step="0.01"
                          value={volume}
                          onChange={(e) => updateRow(r.layer, { volumeOverride: Number(e.target.value) })}
                          className={`w-28 rounded border px-2 py-1 text-right text-sm ${
                            r.volumeOverride !== null ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                          }`}
                        />
                        {r.volumeOverride !== null && (
                          <button
                            type="button"
                            onClick={() => updateRow(r.layer, { volumeOverride: null })}
                            className="ml-1 text-[10px] text-slate-400 hover:underline"
                            title={`Kembalikan ke hasil hitung otomatis (${computedVolume.toFixed(2)})`}
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
                            updateRow(r.layer, {
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
                          onChange={(e) => updateRow(r.layer, { unit_price: Number(e.target.value) })}
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
                  <td colSpan={6} className="px-3 py-2 text-right text-slate-500">Estimasi Total</td>
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

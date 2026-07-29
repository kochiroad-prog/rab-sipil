'use client'

import { useMemo, useState } from 'react'
import { insertDraftItems } from '@/app/(dashboard)/projects/actions'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import { computeDxfTakeoff, isDxfFile, type DxfLayerSummary, type DxfUnitInfo } from '@/lib/dxf-takeoff'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type Basis = 'panjang' | 'luas'

type LayerRow = DxfLayerSummary & {
  include: boolean
  basis: Basis
  ahsp_item_id: string | null
  unit_price: number
  tkdn_percent: number
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? '__none__')
  const activeProjectId = projectId ?? (selectedProjectId !== '__none__' ? selectedProjectId : null)

  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [unit, setUnit] = useState<DxfUnitInfo | null>(null)
  const [manualScale, setManualScale] = useState('')
  const [rows, setRows] = useState<LayerRow[]>([])
  const [section, setSection] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const estimatedTotal = useMemo(
    () =>
      rows
        .filter((r) => r.include)
        .reduce((sum, r) => sum + (r.basis === 'luas' ? r.totalAreaM2 : r.totalLengthM) * r.unit_price, 0),
    [rows]
  )

  function runParse(text: string, scaleOverride?: number) {
    try {
      const result = computeDxfTakeoff(text, scaleOverride)
      setUnit(result.unit)
      setRows(
        result.layers.map((l) => ({
          ...l,
          include: true,
          basis: l.totalAreaM2 > 0 ? 'luas' : 'panjang',
          ahsp_item_id: null,
          unit_price: 0,
          tkdn_percent: 0,
        }))
      )
      setError(null)
      if (result.layers.length === 0) {
        setError('Tidak ada garis/polyline yang terbaca dari file ini (cek isinya, atau format bukan DXF ASCII).')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membaca file DXF')
      setRows([])
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
        volume: r.basis === 'luas' ? r.totalAreaM2 : r.totalLengthM,
        ahsp_item_id: r.ahsp_item_id,
        unit_price: r.unit_price,
        tkdn_percent: r.tkdn_percent,
      }))
    if (chosen.length === 0) {
      setError('Tidak ada layer yang dicentang untuk disimpan.')
      return
    }
    setLoading(true)
    const { error: saveError } = await insertDraftItems(activeProjectId, section || null, chosen)
    setLoading(false)
    if (saveError) {
      setError(saveError)
      return
    }
    setSaveMsg(`${chosen.length} item (dari layer DXF) ditambahkan ke Rincian RAB.`)
    setRawText('')
    setFileName('')
    setUnit(null)
    setRows([])
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

        <input
          type="file"
          accept=".dxf"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="block text-sm"
        />

        {fileName && unit && (
          <p className="text-xs text-slate-500">
            {fileName} · satuan gambar: {unit.unitName}
            {!unit.detected && ' (tidak terbaca dari file — cek/isi skala manual di bawah bila hasil hitung terasa salah)'}
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

      {rows.length > 0 && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Kategori di RAB</label>
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Layer</th>
                  <th className="px-3 py-2 font-medium">Basis</th>
                  <th className="px-3 py-2 text-right font-medium">Volume</th>
                  <th className="px-3 py-2 font-medium">Referensi AHSP</th>
                  <th className="px-3 py-2 text-right font-medium">Harga Satuan</th>
                  <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const volume = r.basis === 'luas' ? r.totalAreaM2 : r.totalLengthM
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
                          onChange={(e) => updateRow(r.layer, { basis: e.target.value as Basis })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="panjang" disabled={r.totalLengthM <= 0}>Panjang (m1)</option>
                          <option value="luas" disabled={r.totalAreaM2 <= 0}>Luas (m2)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right align-top text-slate-700">{volume.toFixed(2)}</td>
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

'use client'

import { useMemo, useRef, useState } from 'react'
import { Upload, Loader2, Check, X } from 'lucide-react'
import { insertDraftItems } from '@/app/(dashboard)/projects/actions'
import AhspCombobox, { type AhspOption } from '@/components/AhspCombobox'
import { uploadToBucket } from '@/lib/upload-client'
import { pdfToImageBlobs, isPdfFile } from '@/lib/pdf-to-images'

const MAX_IMAGES = 5

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

type VisionQuestion = {
  key: string
  label: string
  type: 'single' | 'multi' | 'number'
  options?: string[]
  unit?: string
  allowCustom?: boolean
}

type DetectResult = {
  job_name: string
  confidence: string
  notes: string
  questions: VisionQuestion[]
  template_id: string | null
  template_name: string | null
}

type MatchedVia = 'rule' | 'ai' | 'none' | 'manual'

const MATCH_BADGE: Record<MatchedVia, { label: string; className: string; title: string }> = {
  rule: { label: 'Rule', className: 'bg-emerald-50 text-emerald-700', title: 'Cocok otomatis (skor tinggi, deterministik)' },
  ai: { label: 'AI', className: 'bg-purple-50 text-purple-700', title: 'Dipilih AI dari kandidat rule engine — cek ulang sebelum disimpan' },
  manual: { label: 'Manual', className: 'bg-blue-50 text-blue-700', title: 'Dipilih manual' },
  none: { label: 'Kosong', className: 'bg-slate-100 text-slate-500', title: 'Tidak ada saran — pilih manual atau isi harga sendiri' },
}

type DraftItem = {
  name: string
  unit: string
  volume_estimate: number | null
  note: string
  include: boolean
  ahsp_item_id: string | null
  unit_price: number
  tkdn_percent: number
  match_score: number
  matched_via: MatchedVia
}

type Stage = 'upload' | 'questions' | 'review'

type ProjectOpt = { id: string; name: string }

export default function VisionEstimator({
  projectId,
  projects,
  ahspItems,
}: {
  projectId?: string
  projects?: ProjectOpt[]
  ahspItems: AhspOption[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('upload')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [hints, setHints] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId ?? '__none__')

  const activeProjectId = projectId ?? (selectedProjectId !== '__none__' ? selectedProjectId : null)

  const [estimationId, setEstimationId] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [items, setItems] = useState<DraftItem[]>([])
  const [section, setSection] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const estimatedTotal = useMemo(
    () => items.filter((it) => it.include).reduce((sum, it) => sum + (it.volume_estimate ?? 0) * it.unit_price, 0),
    [items]
  )

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const remaining = Math.max(0, MAX_IMAGES - images.length)
      const chosen = Array.from(files).slice(0, remaining)
      const urls: string[] = []
      for (const file of chosen) {
        try {
          if (isPdfFile(file)) {
            // PDF: render tiap halaman jadi gambar dulu di browser, baru upload per halaman.
            const pageBlobs = await pdfToImageBlobs(file)
            if (pageBlobs.length === 0) {
              setError(`Gagal membaca halaman PDF "${file.name}".`)
              continue
            }
            for (const blob of pageBlobs) {
              urls.push(await uploadToBucket('project-photos', blob, 'png'))
            }
          } else {
            urls.push(await uploadToBucket('project-photos', file))
          }
        } catch (e) {
          setError('Upload gagal: ' + (e instanceof Error ? e.message : 'tidak diketahui'))
        }
      }
      setImages((prev) => [...prev, ...urls])
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeImage(u: string) {
    setImages((prev) => prev.filter((x) => x !== u))
  }

  async function handleDetect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/vision-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, hints }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal menganalisa')
      setDetection(data)
      setStage('questions')

      // Simpan riwayat analisa (foto + hasil deteksi) permanen — tidak lagi hilang setelah sesi.
      try {
        const saveRes = await fetch('/api/ai/estimations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: activeProjectId,
            image_urls: images,
            job_name: data.job_name,
            hints,
            template_id: data.template_id,
            template_name: data.template_name,
            confidence: data.confidence,
            notes: data.notes,
            questions: data.questions,
          }),
        })
        const saveData = await saveRes.json()
        if (saveRes.ok) setEstimationId(saveData.id)
      } catch {
        // riwayat gagal disimpan — tidak menghentikan alur analisa utama
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (!detection) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/vision-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          job_name: detection.job_name,
          answers,
          template_id: detection.template_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat draft')
      const draft: DraftItem[] = (data.items ?? []).map(
        (it: {
          name: string
          unit: string
          volume_estimate: number | null
          note: string
          ahsp_item_id?: string | null
          unit_price?: number
          tkdn_percent?: number
          match_score?: number
          matched_via?: MatchedVia
        }) => ({
          name: it.name,
          unit: it.unit,
          volume_estimate: it.volume_estimate,
          note: it.note,
          include: true,
          ahsp_item_id: it.ahsp_item_id ?? null,
          unit_price: it.unit_price ?? 0,
          tkdn_percent: it.tkdn_percent ?? 0,
          match_score: it.match_score ?? 0,
          matched_via: it.matched_via ?? 'none',
        })
      )
      setItems(draft)
      setSection(detection.job_name)
      setStage('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!activeProjectId) {
      setError('Pilih proyek dulu sebelum menyimpan ke Rincian RAB.')
      return
    }
    setLoading(true)
    setSaveMsg(null)
    const chosen = items
      .filter((it) => it.include)
      .map((it) => ({
        name: it.name,
        unit: it.unit,
        volume: it.volume_estimate ?? 0,
        ahsp_item_id: it.ahsp_item_id,
        unit_price: it.unit_price,
        tkdn_percent: it.tkdn_percent,
      }))
    const { error } = await insertDraftItems(activeProjectId, section || null, chosen)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    if (estimationId) {
      fetch('/api/ai/estimations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: estimationId, answers, status: 'saved', items_count: chosen.length, project_id: activeProjectId }),
      }).catch(() => {})
    }
    setSaveMsg(`${chosen.length} item ditambahkan ke Rincian RAB.`)
    setStage('upload')
    setImages([])
    setHints('')
    setDetection(null)
    setAnswers({})
    setItems([])
    setEstimationId(null)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">AI Estimator — Foto / Gambar Kerja</h3>
      <p className="mt-1 text-sm text-slate-500">
        Upload foto lokasi atau gambar kerja (denah/potongan), AI akan kenali jenis pekerjaan, bertanya spesifikasi,
        lalu susun draft rincian RAB. Volume & harga hasil AI tetap harus diverifikasi manual.
      </p>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saveMsg && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saveMsg}</p>}

      {stage === 'upload' && (
        <div className="mt-4 space-y-3">
          {projects && projects.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600">Masukkan ke Proyek (opsional)</label>
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

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= MAX_IMAGES}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
                  images.length >= MAX_IMAGES ? 'bg-emerald-600/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:opacity-70`}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : images.length >= MAX_IMAGES ? (
                  <Check className="size-3.5" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {uploading
                  ? 'Memproses...'
                  : images.length >= MAX_IMAGES
                    ? `Maks. ${MAX_IMAGES} file`
                    : 'Pilih Foto / PDF'}
              </button>
              {images.length > 0 && (
                <span className="text-xs text-slate-500">{images.length} dari {MAX_IMAGES} gambar</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <p className="mt-1 text-[11px] text-slate-400">Bisa foto atau PDF gambar kerja (tiap halaman PDF otomatis jadi gambar), maks {MAX_IMAGES} file.</p>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((u) => (
                  <div key={u} className="group relative h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="foto lokasi" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(u)}
                      title="Hapus gambar ini"
                      className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <textarea
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            rows={2}
            placeholder="Keterangan tambahan (opsional): mis. 'pondasi rumah 1 lantai, keliling 40m'"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleDetect}
            disabled={loading || uploading || (images.length === 0 && !hints.trim())}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Menganalisa...' : 'Analisa'}
          </button>
        </div>
      )}

      {stage === 'questions' && detection && (
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-900">{detection.job_name}</span>
            <span className="ml-2 text-slate-500">confidence: {detection.confidence}</span>
            {detection.template_name && (
              <span className="ml-2 text-emerald-600">· cocok template &quot;{detection.template_name}&quot;</span>
            )}
            {detection.notes && <p className="mt-1 text-slate-500">{detection.notes}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {detection.questions.map((q) => (
              <div key={q.key}>
                <label className="block text-xs font-medium text-slate-600">
                  {q.label} {q.unit ? `(${q.unit})` : ''}
                </label>
                {q.type === 'number' ? (
                  <input
                    type="number"
                    step="0.01"
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : q.options && q.options.length > 0 ? (
                  <select
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">-- pilih --</option>
                    {q.options.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Menyusun draft...' : 'Buat Draft Rincian'}
          </button>
        </div>
      )}

      {stage === 'review' && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Kategori di RAB</label>
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-1 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-slate-400">
            Harga satuan tersaran otomatis dari referensi AHSP yang paling cocok. Badge{' '}
            <span className="rounded bg-emerald-50 px-1 py-0.5 text-emerald-700">Rule</span> = cocok otomatis skor
            tinggi (deterministik), <span className="rounded bg-purple-50 px-1 py-0.5 text-purple-700">AI</span> =
            dipilih AI dari kandidat rule engine (cek ulang!),{' '}
            <span className="rounded bg-blue-50 px-1 py-0.5 text-blue-700">Manual</span> = kamu pilih sendiri,{' '}
            <span className="rounded bg-slate-100 px-1 py-0.5 text-slate-500">Kosong</span> = belum ada saran.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Uraian</th>
                  <th className="px-3 py-2 font-medium">Satuan</th>
                  <th className="px-3 py-2 font-medium">Volume</th>
                  <th className="px-3 py-2 font-medium">Referensi AHSP</th>
                  <th className="px-3 py-2 text-right font-medium">Harga Satuan</th>
                  <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={it.include}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, xi) => (xi === i ? { ...x, include: e.target.checked } : x)))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        value={it.name}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))
                        }
                        className="w-full min-w-[180px] rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      {it.note && <p className="mt-1 text-xs text-slate-400">{it.note}</p>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        value={it.unit}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, xi) => (xi === i ? { ...x, unit: e.target.value } : x)))
                        }
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="0.01"
                        value={it.volume_estimate ?? ''}
                        onChange={(e) =>
                          setItems((arr) =>
                            arr.map((x, xi) => (xi === i ? { ...x, volume_estimate: Number(e.target.value) } : x))
                          )
                        }
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-1.5 min-w-[220px]">
                        <span
                          title={MATCH_BADGE[it.matched_via].title}
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${MATCH_BADGE[it.matched_via].className}`}
                        >
                          {MATCH_BADGE[it.matched_via].label}
                        </span>
                        <AhspCombobox
                          items={ahspItems}
                          placeholder="Cari AHSP..."
                          className="flex-1"
                          defaultSelected={ahspItems.find((a) => a.id === it.ahsp_item_id) ?? null}
                          onSelect={(picked) =>
                            setItems((arr) =>
                              arr.map((x, xi) =>
                                xi === i
                                  ? {
                                      ...x,
                                      ahsp_item_id: picked?.id ?? null,
                                      unit_price: picked?.unit_price ?? x.unit_price,
                                      tkdn_percent: picked?.tkdn_percent ?? x.tkdn_percent,
                                      unit: picked?.unit ?? x.unit,
                                      match_score: picked ? 1 : 0,
                                      matched_via: picked ? 'manual' : 'none',
                                    }
                                  : x
                              )
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        step="1"
                        value={it.unit_price}
                        onChange={(e) =>
                          setItems((arr) =>
                            arr.map((x, xi) => (xi === i ? { ...x, unit_price: Number(e.target.value) } : x))
                          )
                        }
                        className="w-28 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right align-top font-medium text-slate-900">
                      {formatRupiah((it.volume_estimate ?? 0) * it.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right text-slate-500">Estimasi Total</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {formatRupiah(estimatedTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Masukkan ke Rincian RAB'}
            </button>
            <button
              onClick={() => setStage('questions')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { insertDraftItems } from '@/app/(dashboard)/projects/actions'

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

type DraftItem = { name: string; unit: string; volume_estimate: number | null; note: string; include: boolean }

type Stage = 'upload' | 'questions' | 'review'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function VisionEstimator({ projectId }: { projectId: string }) {
  const [stage, setStage] = useState<Stage>('upload')
  const [images, setImages] = useState<string[]>([])
  const [hints, setHints] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detection, setDetection] = useState<DetectResult | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [items, setItems] = useState<DraftItem[]>([])
  const [section, setSection] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const urls = await Promise.all(Array.from(files).slice(0, 5).map(fileToDataUrl))
    setImages(urls)
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
        (it: { name: string; unit: string; volume_estimate: number | null; note: string }) => ({
          ...it,
          include: true,
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
    setLoading(true)
    setSaveMsg(null)
    const chosen = items
      .filter((it) => it.include)
      .map((it) => ({ name: it.name, unit: it.unit, volume: it.volume_estimate ?? 0 }))
    const { error } = await insertDraftItems(projectId, section || null, chosen)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    setSaveMsg(`${chosen.length} item ditambahkan ke Rincian RAB.`)
    setStage('upload')
    setImages([])
    setHints('')
    setDetection(null)
    setAnswers({})
    setItems([])
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
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="block text-sm"
          />
          {images.length > 0 && <p className="text-xs text-slate-500">{images.length} gambar dipilih.</p>}
          <textarea
            value={hints}
            onChange={(e) => setHints(e.target.value)}
            rows={2}
            placeholder="Keterangan tambahan (opsional): mis. 'pondasi rumah 1 lantai, keliling 40m'"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleDetect}
            disabled={loading || (images.length === 0 && !hints.trim())}
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
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Uraian</th>
                  <th className="px-3 py-2 font-medium">Satuan</th>
                  <th className="px-3 py-2 font-medium">Estimasi Volume</th>
                  <th className="px-3 py-2 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={it.include}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, xi) => (xi === i ? { ...x, include: e.target.checked } : x)))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={it.name}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))
                        }
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={it.unit}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, xi) => (xi === i ? { ...x, unit: e.target.value } : x)))
                        }
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={it.volume_estimate ?? ''}
                        onChange={(e) =>
                          setItems((arr) =>
                            arr.map((x, xi) => (xi === i ? { ...x, volume_estimate: Number(e.target.value) } : x))
                          )
                        }
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{it.note}</td>
                  </tr>
                ))}
              </tbody>
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

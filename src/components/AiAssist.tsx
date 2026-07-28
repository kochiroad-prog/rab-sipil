'use client'

import { useState } from 'react'

type Suggestion = { name: string; unit: string; volume_estimate: number; note?: string }

export default function AiAssist() {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)

  async function handleAsk() {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setSuggestions(null)

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gagal meminta saran AI')

      try {
        const parsed = JSON.parse(data.result)
        setSuggestions(Array.isArray(parsed) ? parsed : null)
      } catch {
        setError('AI membalas format tidak sesuai. Coba deskripsi lebih spesifik.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Asisten AI (OpenRouter)</h3>
      <p className="mt-1 text-sm text-slate-500">
        Jelaskan pekerjaan secara bebas, AI akan menyarankan draft item RAB (nama, satuan, estimasi
        volume). Harga satuan tetap diisi manual dari database AHSP.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Contoh: pekerjaan pondasi batu kali untuk rumah 1 lantai, keliling pondasi 40 meter"
        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <button
        onClick={handleAsk}
        disabled={loading}
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Meminta saran...' : 'Minta Saran AI'}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Nama</th>
                <th className="px-3 py-2 font-medium">Satuan</th>
                <th className="px-3 py-2 font-medium">Estimasi Volume</th>
                <th className="px-3 py-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suggestions.map((s, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2">{s.unit}</td>
                  <td className="px-3 py-2">{s.volume_estimate}</td>
                  <td className="px-3 py-2 text-slate-500">{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { payTermin } from '@/app/(dashboard)/upah-kerja/actions'

export default function TerminPayForm({ terminId }: { terminId: string }) {
  const [open, setOpen] = useState(false)
  const [proofDataUrl, setProofDataUrl] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProofDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-emerald-700 hover:underline">
        Bayar
      </button>
    )
  }

  return (
    <form action={payTermin} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="id" value={terminId} />
      <input type="hidden" name="proof_url" value={proofDataUrl} />
      <input type="file" accept="image/*,.pdf" onChange={handleFile} className="text-xs" />
      <input name="note" placeholder="Catatan" className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs" />
      <button type="submit" className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-800">
        Konfirmasi Lunas
      </button>
    </form>
  )
}

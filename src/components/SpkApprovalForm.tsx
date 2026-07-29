'use client'

import { useState } from 'react'
import { saveApproval } from '@/app/(dashboard)/projects/[id]/manpower/spk/actions'
import SignaturePad from '@/components/SignaturePad'
import type { SpkApproval } from '@/types/database'

export default function SpkApprovalForm({
  spkId,
  projectId,
  role,
  label,
  existing,
}: {
  spkId: string
  projectId: string
  role: string
  label: string
  existing?: SpkApproval
}) {
  const [open, setOpen] = useState(!existing?.signed_at)

  if (existing?.signed_at && !open) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <p className="font-medium text-emerald-800">{label}</p>
        <p className="text-emerald-700">{existing.name ?? '-'} · ditandatangani {new Date(existing.signed_at).toLocaleDateString('id-ID')}</p>
        {existing.signature_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existing.signature_url} alt="TTD" className="mt-1 h-12 object-contain" />
        )}
        <button onClick={() => setOpen(true)} className="mt-1 text-xs text-slate-500 hover:underline">
          Ubah
        </button>
      </div>
    )
  }

  return (
    <form action={saveApproval} className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
      <input type="hidden" name="spk_id" value={spkId} />
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="role" value={role} />
      <p className="font-medium text-slate-800">{label}</p>
      <input name="name" defaultValue={existing?.name ?? ''} placeholder="Nama" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
      <SignaturePad name="signature_data_url" />
      <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
        Simpan Tanda Tangan
      </button>
    </form>
  )
}

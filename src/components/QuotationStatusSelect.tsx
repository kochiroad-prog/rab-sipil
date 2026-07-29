'use client'

import { updateQuotationStatus } from '@/app/(dashboard)/projects/[id]/quotation/actions'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  terkirim: 'Terkirim',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
}

export default function QuotationStatusSelect({
  quotationId,
  projectId,
  status,
}: {
  quotationId: string
  projectId: string
  status: string
}) {
  return (
    <form action={updateQuotationStatus} className="flex items-center gap-2">
      <input type="hidden" name="id" value={quotationId} />
      <input type="hidden" name="project_id" value={projectId} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        {Object.entries(STATUS_LABEL).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </form>
  )
}

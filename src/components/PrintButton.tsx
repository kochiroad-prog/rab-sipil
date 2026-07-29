'use client'

export default function PrintButton({ label = 'Cetak' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      {label}
    </button>
  )
}

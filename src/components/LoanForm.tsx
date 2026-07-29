import { addLoan } from '@/app/(dashboard)/equipment/actions'
import type { Project } from '@/types/database'

const CONDITIONS = [
  ['baik', 'Baik'],
  ['rusak_ringan', 'Rusak Ringan'],
  ['rusak_berat', 'Rusak Berat'],
  ['perbaikan', 'Dalam Perbaikan'],
] as const

export default function LoanForm({ equipmentId, projects }: { equipmentId: string; projects: Project[] }) {
  return (
    <form action={addLoan} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Pinjamkan Alat</h3>
      <input type="hidden" name="equipment_id" value={equipmentId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input name="borrower_name" required placeholder="Nama peminjam" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        <input name="borrower_role" placeholder="Jabatan/peran" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

        <select name="project_id" defaultValue="" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2">
          <option value="">-- Untuk proyek (opsional) --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select name="condition_out" defaultValue="baik" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2">
          {CONDITIONS.map(([v, l]) => (
            <option key={v} value={v}>Kondisi saat keluar: {l}</option>
          ))}
        </select>

        <label className="flex flex-col text-xs text-slate-500 sm:col-span-2">
          Tgl pinjam
          <input name="loan_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col text-xs text-slate-500 sm:col-span-2">
          Rencana kembali
          <input name="expected_return_date" type="date" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <input name="notes" placeholder="Catatan (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
          Pinjamkan
        </button>
      </div>
    </form>
  )
}

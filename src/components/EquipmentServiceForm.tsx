import { addEquipmentService } from '@/app/(dashboard)/equipment/actions'

const TYPES = [
  ['rutin', 'Servis Rutin'],
  ['perbaikan', 'Perbaikan'],
  ['kalibrasi', 'Kalibrasi'],
] as const

export default function EquipmentServiceForm({
  equipmentId,
  currentInterval,
}: {
  equipmentId: string
  currentInterval: number | null
}) {
  return (
    <form action={addEquipmentService} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-medium text-slate-900">Catat Servis</h3>
      <input type="hidden" name="equipment_id" value={equipmentId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="flex flex-col text-xs text-slate-500 sm:col-span-1">
          Tgl servis
          <input name="service_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <select name="service_type" defaultValue="rutin" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1">
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input name="cost" type="number" step="1" placeholder="Biaya" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
        <input name="vendor" placeholder="Bengkel/vendor" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />

        <label className="flex flex-col text-xs text-slate-500 sm:col-span-2">
          Interval servis rutin berikutnya (bulan)
          <input name="service_interval_months" type="number" step="1" min="0" defaultValue={currentInterval ?? ''} placeholder="mis. 6 — kosongkan bila tak ada jadwal rutin" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <input name="notes" placeholder="Catatan (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
          Simpan
        </button>
      </div>
    </form>
  )
}

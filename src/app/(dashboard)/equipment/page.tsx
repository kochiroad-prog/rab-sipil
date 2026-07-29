import { createClient } from '@/lib/supabase/server'
import type { Equipment } from '@/types/database'
import EquipmentForm from '@/components/EquipmentForm'
import EquipmentBrowser, { type ActiveLoanInfo } from '@/components/EquipmentBrowser'

export default async function EquipmentPage() {
  const supabase = await createClient()

  const { data: equipmentRaw } = await supabase
    .from('equipment')
    .select('*')
    .order('name')
    .returns<Equipment[]>()
  const equipment = equipmentRaw ?? []

  const { data: loansRaw } = await supabase
    .from('equipment_loans')
    .select('equipment_id, borrower_name, loan_date, expected_return_date')
    .eq('status', 'dipinjam')

  const activeLoans: Record<string, ActiveLoanInfo> = {}
  for (const l of loansRaw ?? []) {
    activeLoans[l.equipment_id] = {
      borrower_name: l.borrower_name,
      loan_date: l.loan_date,
      expected_return_date: l.expected_return_date,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Peralatan &amp; Peminjaman Alat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Inventaris alat kerja beserta status pinjam-kembali. Klik detail alat untuk mencatat peminjaman.
        </p>
      </div>

      <EquipmentForm />

      <EquipmentBrowser equipment={equipment} activeLoans={activeLoans} />
    </div>
  )
}

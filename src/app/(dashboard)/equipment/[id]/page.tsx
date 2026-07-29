import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Equipment, EquipmentLoan, Project } from '@/types/database'
import LoanForm from '@/components/LoanForm'
import ReturnLoanForm from '@/components/ReturnLoanForm'
import { deleteLoan } from '../actions'

const CATEGORY_LABEL: Record<string, string> = {
  alat_berat: 'Alat Berat',
  alat_tangan: 'Alat Tangan',
  alat_ukur: 'Alat Ukur',
  scaffolding: 'Scaffolding/Perancah',
  genset: 'Genset',
  alat_listrik: 'Alat Listrik',
  lainnya: 'Lainnya',
}

const STATUS_BADGE: Record<string, string> = {
  dipinjam: 'bg-orange-50 text-orange-700',
  dikembalikan: 'bg-emerald-50 text-emerald-700',
  hilang: 'bg-red-50 text-red-700',
  rusak: 'bg-red-50 text-red-700',
}

function formatRupiah(n: number | null) {
  if (n === null) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .single<Equipment>()

  if (!equipment) notFound()

  const { data: loansRaw } = await supabase
    .from('equipment_loans')
    .select('*')
    .eq('equipment_id', id)
    .order('loan_date', { ascending: false })
    .returns<EquipmentLoan[]>()
  const loans = loansRaw ?? []
  const activeLoan = loans.find((l) => l.status === 'dipinjam')

  const { data: projectsRaw } = await supabase.from('projects').select('*').order('name').returns<Project[]>()
  const projects = projectsRaw ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href="/equipment" className="text-sm text-blue-700 hover:underline">
          &larr; Kembali ke Peralatan
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{equipment.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {CATEGORY_LABEL[equipment.category] ?? equipment.category}
          {equipment.code ? ` · Kode: ${equipment.code}` : ''}
          {equipment.brand ? ` · ${equipment.brand}` : ''}
          {equipment.model ? ` ${equipment.model}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-slate-400">Kondisi</p>
          <p className="font-medium text-slate-800">{equipment.condition}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Lokasi</p>
          <p className="font-medium text-slate-800">{equipment.location ?? '-'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Harga Beli</p>
          <p className="font-medium text-slate-800">{formatRupiah(equipment.purchase_price)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Servis Berikutnya</p>
          <p className="font-medium text-slate-800">{equipment.next_service_date ?? '-'}</p>
        </div>
      </div>

      {activeLoan ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-medium text-orange-800">
            Sedang dipinjam oleh {activeLoan.borrower_name}
            {activeLoan.borrower_role ? ` (${activeLoan.borrower_role})` : ''} sejak {activeLoan.loan_date}
          </p>
          <div className="mt-3">
            <ReturnLoanForm loanId={activeLoan.id} equipmentId={equipment.id} />
          </div>
        </div>
      ) : (
        <LoanForm equipmentId={equipment.id} projects={projects} />
      )}

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Riwayat Peminjaman</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Peminjam</th>
                <th className="px-4 py-3 font-medium">Tgl Pinjam</th>
                <th className="px-4 py-3 font-medium">Tgl Kembali</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada riwayat peminjaman.</td>
                </tr>
              )}
              {loans.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-900">
                    {l.borrower_name}
                    {l.borrower_role ? <span className="ml-1 text-xs text-slate-400">({l.borrower_role})</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.loan_date}</td>
                  <td className="px-4 py-3 text-slate-600">{l.actual_return_date ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[l.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.status !== 'dipinjam' && (
                      <Link href={`/equipment/loans/${l.id}/receipt`} className="mr-3 text-xs text-blue-700 hover:underline">
                        Tanda Terima
                      </Link>
                    )}
                    <form action={deleteLoan} className="inline">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="equipment_id" value={equipment.id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

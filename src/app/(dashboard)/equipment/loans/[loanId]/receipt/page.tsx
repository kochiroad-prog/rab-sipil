import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Equipment, EquipmentLoan, Project } from '@/types/database'
import PrintButton from '@/components/PrintButton'

export default async function LoanReceiptPage({ params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = await params
  const supabase = await createClient()

  const { data: loan } = await supabase
    .from('equipment_loans')
    .select('*')
    .eq('id', loanId)
    .single<EquipmentLoan>()

  if (!loan) notFound()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', loan.equipment_id)
    .single<Equipment>()

  let project: Project | null = null
  if (loan.project_id) {
    const { data } = await supabase.from('projects').select('*').eq('id', loan.project_id).single<Project>()
    project = data
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between">
        <Link href={equipment ? `/equipment/${equipment.id}` : '/equipment'} className="text-sm text-blue-700 hover:underline">
          &larr; Kembali
        </Link>
        <PrintButton label="Cetak Tanda Terima" />
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0 print:shadow-none">
        <h1 className="text-center text-lg font-semibold text-slate-900">TANDA TERIMA PEMINJAMAN ALAT</h1>
        <p className="mt-1 text-center text-xs text-slate-400">
          Status: {loan.status === 'dipinjam' ? 'Sedang Dipinjam' : loan.status === 'dikembalikan' ? 'Sudah Dikembalikan' : loan.status}
        </p>

        <table className="mt-6 w-full text-sm">
          <tbody>
            <tr>
              <td className="w-40 py-1 align-top text-slate-500">Nama Alat</td>
              <td className="py-1 font-medium text-slate-900">: {equipment?.name}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Kode/Merek</td>
              <td className="py-1 text-slate-800">: {[equipment?.code, equipment?.brand, equipment?.model].filter(Boolean).join(' / ') || '-'}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Proyek</td>
              <td className="py-1 text-slate-800">: {project?.name ?? '-'}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Peminjam</td>
              <td className="py-1 text-slate-800">: {loan.borrower_name}{loan.borrower_role ? ` (${loan.borrower_role})` : ''}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Tanggal Pinjam</td>
              <td className="py-1 text-slate-800">: {loan.loan_date}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Kondisi Saat Keluar</td>
              <td className="py-1 text-slate-800">: {loan.condition_out ?? '-'}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Tanggal Kembali</td>
              <td className="py-1 text-slate-800">: {loan.actual_return_date ?? '-'}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Kondisi Saat Kembali</td>
              <td className="py-1 text-slate-800">: {loan.condition_in ?? '-'}</td>
            </tr>
            <tr>
              <td className="py-1 align-top text-slate-500">Catatan</td>
              <td className="py-1 text-slate-800">: {loan.notes ?? '-'}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-10 grid grid-cols-2 gap-6 text-center text-sm">
          <div>
            <p className="text-slate-500">Diserahkan oleh</p>
            <div className="mt-16 border-t border-slate-400 pt-1">( Petugas/Gudang )</div>
          </div>
          <div>
            <p className="text-slate-500">Diterima/Dikembalikan oleh</p>
            {loan.signature_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={loan.signature_data_url} alt="Tanda tangan" className="mx-auto h-20 object-contain" />
            ) : (
              <div className="h-20" />
            )}
            <div className="border-t border-slate-400 pt-1">( {loan.borrower_name} )</div>
          </div>
        </div>
      </div>
    </div>
  )
}

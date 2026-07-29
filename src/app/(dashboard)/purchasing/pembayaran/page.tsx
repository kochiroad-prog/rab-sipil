import { createClient } from '@/lib/supabase/server'
import type { PurchaseOrder, PurchasePayment } from '@/types/database'
import PaymentForm from '@/components/PaymentForm'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default async function PembayaranPage() {
  const supabase = await createClient()

  const { data: invoicedRaw } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('status', 'invoiced')
    .order('invoice_date', { ascending: true })
    .returns<PurchaseOrder[]>()
  const invoiced = invoicedRaw ?? []

  const groups = new Map<string, PurchaseOrder[]>()
  for (const po of invoiced) {
    const key = po.supplier_name || 'Tanpa Nama Supplier'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(po)
  }

  const { data: paymentsRaw } = await supabase
    .from('purchase_payments')
    .select('*')
    .order('paid_at', { ascending: false })
    .returns<PurchasePayment[]>()
  const payments = paymentsRaw ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pembayaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          Antrean PO berstatus Invoiced, dikelompokkan per supplier. Bayar dengan bukti transfer.
        </p>
      </div>

      {groups.size === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Tidak ada invoice yang menunggu pembayaran. Catat invoice dari halaman PO &amp; Invoice terlebih dahulu.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(groups.entries()).map(([supplierName, pos]) => (
            <PaymentForm key={supplierName} supplierName={supplierName} pos={pos} />
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Riwayat Pembayaran</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Jumlah PO</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada riwayat pembayaran.</td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-slate-600">{new Date(p.paid_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-4 py-3 text-slate-900">{p.supplier_name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.po_ids.length}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(p.total_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {p.proof_url ? (
                      <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline">
                        Lihat Bukti
                      </a>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
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

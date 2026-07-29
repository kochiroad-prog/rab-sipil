import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CompanyProfile, Project, PurchaseOrder, PurchaseOrderItem } from '@/types/database'
import PrintButton from '@/components/PrintButton'
import { recordInvoice } from '@/app/(dashboard)/purchasing/actions'
import { receivePurchaseOrderToWarehouse } from '../../../warehouse/actions'
import { cancelPurchaseOrder } from '../../po-actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  ordered: 'Dipesan',
  invoiced: 'Invoiced',
  paid: 'Lunas',
  cancelled: 'Dibatalkan',
}

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; poId: string }>
}) {
  const { id, poId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', poId).single<PurchaseOrder>()
  if (!po) notFound()

  const { data: itemsRaw } = await supabase
    .from('purchase_order_items')
    .select('*')
    .eq('po_id', poId)
    .order('sort', { ascending: true })
    .returns<PurchaseOrderItem[]>()
  const items = itemsRaw ?? []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .eq('owner_id', user?.id ?? '')
    .maybeSingle<CompanyProfile>()

  const { data: warehouse } = await supabase
    .from('project_warehouses')
    .select('id')
    .eq('project_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const retensi = (po.total_amount * po.retensi_pct) / 100

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between">
        <Link href={`/projects/${id}/purchasing`} className="text-sm text-blue-700 hover:underline">
          &larr; Kembali ke Purchasing
        </Link>
        <div className="flex items-center gap-2">
          {po.status === 'ordered' && (
            <form action={cancelPurchaseOrder}>
              <input type="hidden" name="id" value={po.id} />
              <input type="hidden" name="project_id" value={id} />
              <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                Batalkan PO
              </button>
            </form>
          )}
          {!po.received && po.status !== 'cancelled' && warehouse && (
            <form action={receivePurchaseOrderToWarehouse}>
              <input type="hidden" name="po_id" value={po.id} />
              <input type="hidden" name="warehouse_id" value={warehouse.id} />
              <input type="hidden" name="project_id" value={id} />
              <button className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
                Terima ke Gudang
              </button>
            </form>
          )}
          {po.received && (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Sudah diterima di gudang</span>
          )}
          <PrintButton label="Cetak PO" />
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-sm print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{companyProfile?.company_name || 'Nama Perusahaan Anda'}</p>
            {companyProfile?.address && <p className="text-xs text-slate-500">{companyProfile.address}</p>}
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>No: {po.po_number}</p>
            <p>{po.po_date}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{STATUS_LABEL[po.status] ?? po.status}</span>
          </div>
        </div>

        <h2 className="mt-4 text-center font-semibold uppercase tracking-wide text-slate-900">Purchase Order</h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Kepada: {po.supplier_name || '-'} · Proyek: {project.name}
        </p>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left text-slate-600">
              <th className="py-1.5 pr-2">No</th>
              <th className="py-1.5 pr-2">Material</th>
              <th className="py-1.5 pr-2 text-right">Qty</th>
              <th className="py-1.5 pr-2">Satuan</th>
              <th className="py-1.5 pr-2 text-right">Harga</th>
              <th className="py-1.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-1 pr-2">{idx + 1}</td>
                <td className="py-1 pr-2">{it.material_name}</td>
                <td className="py-1 pr-2 text-right">{it.qty}</td>
                <td className="py-1 pr-2">{it.unit}</td>
                <td className="py-1 pr-2 text-right">{formatRupiah(it.unit_price)}</td>
                <td className="py-1 text-right">{formatRupiah(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <table className="w-64 text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500">Total PO</td>
                <td className="py-1 text-right font-medium text-slate-800">{formatRupiah(po.total_amount)}</td>
              </tr>
              {po.retensi_pct > 0 && (
                <tr>
                  <td className="py-1 text-slate-500">Retensi ({po.retensi_pct}%)</td>
                  <td className="py-1 text-right text-slate-800">{formatRupiah(retensi)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {po.invoice_number && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-600">
            <p className="font-medium text-slate-800">Invoice Supplier</p>
            <p>No: {po.invoice_number} · Nominal: {formatRupiah(po.invoice_amount ?? 0)} · Tgl: {po.invoice_date}</p>
          </div>
        )}
      </div>

      {po.status === 'ordered' && (
        <div className="print:hidden mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-medium text-slate-900">Catat Invoice Supplier</h3>
          <form action={recordInvoice} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input type="hidden" name="id" value={po.id} />
            <input type="hidden" name="project_id" value={id} />
            <input name="invoice_number" placeholder="No. Invoice" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
            <input name="invoice_amount" type="number" step="1" placeholder="Nominal invoice" defaultValue={po.total_amount} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
            <input name="invoice_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
            <input name="invoice_url" placeholder="Tempel link file invoice (opsional)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
              Simpan Invoice
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

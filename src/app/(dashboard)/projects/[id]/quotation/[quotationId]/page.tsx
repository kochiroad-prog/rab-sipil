import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { CompanyProfile, Project, Quotation, RabItem } from '@/types/database'
import PrintButton from '@/components/PrintButton'
import QuotationStatusSelect from '@/components/QuotationStatusSelect'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatTanggalIndo(dateStr: string) {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string; quotationId: string }>
}) {
  const { id, quotationId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: quotation } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single<Quotation>()
  if (!quotation) notFound()

  const { data: itemsRaw } = await supabase
    .from('rab_items')
    .select('*')
    .eq('project_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .returns<RabItem[]>()
  const items = itemsRaw ?? []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .eq('owner_id', user?.id ?? '')
    .maybeSingle<CompanyProfile>()

  const grouped = new Map<string, RabItem[]>()
  for (const it of items) {
    const key = it.section?.trim() || 'Lainnya'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(it)
  }

  const subtotal = items.reduce((sum, it) => sum + it.volume * it.unit_price, 0)
  const discount = (subtotal * (quotation.discount_percent || 0)) / 100
  const dpp = subtotal - discount
  const ppn = (dpp * project.ppn_percent) / 100
  const total = dpp + ppn

  const defaultGreeting = `Dengan hormat,\n\nSehubungan dengan permintaan penawaran untuk pekerjaan "${project.name}", bersama ini kami sampaikan Surat Penawaran Harga sebagai berikut.`
  const defaultClosing = `Demikian penawaran ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.`

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between">
        <Link href={`/projects/${id}/quotation`} className="text-sm text-blue-700 hover:underline">
          &larr; Kembali
        </Link>
        <div className="flex items-center gap-2">
          <QuotationStatusSelect quotationId={quotation.id} projectId={id} status={quotation.status} />
          <PrintButton label="Cetak / Simpan PDF" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-sm leading-relaxed text-slate-800 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{companyProfile?.company_name || 'Nama Perusahaan Anda'}</p>
            {companyProfile?.address && <p className="text-xs text-slate-500">{companyProfile.address}</p>}
            <p className="text-xs text-slate-500">
              {[companyProfile?.phone, companyProfile?.email].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>No: {quotation.quote_number || '-'}</p>
            <p>{formatTanggalIndo(quotation.quote_date)}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-slate-500">Kepada Yth.</p>
          <p className="font-medium text-slate-900">{quotation.client_name || '(Nama Klien)'}</p>
          {quotation.client_address && <p className="text-slate-600">{quotation.client_address}</p>}
          {quotation.client_contact && <p className="text-slate-600">{quotation.client_contact}</p>}
        </div>

        <h2 className="mt-6 text-center font-semibold uppercase tracking-wide text-slate-900">
          Surat Penawaran Harga
        </h2>
        <p className="text-center text-xs text-slate-500">Perihal: {project.name}</p>

        <p className="mt-4 whitespace-pre-line text-slate-700">{quotation.greeting || defaultGreeting}</p>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left text-slate-600">
              <th className="py-1.5 pr-2">No</th>
              <th className="py-1.5 pr-2">Uraian Pekerjaan</th>
              <th className="py-1.5 pr-2 text-right">Volume</th>
              <th className="py-1.5 pr-2">Satuan</th>
              <th className="py-1.5 pr-2 text-right">Harga Satuan</th>
              <th className="py-1.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([section, secItems]) => (
              <Fragment key={section}>
                <tr>
                  <td colSpan={6} className="pt-3 pb-1 font-medium text-slate-800">{section}</td>
                </tr>
                {secItems.map((it, idx) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-1 pr-2 align-top text-slate-500">{idx + 1}</td>
                    <td className="py-1 pr-2 align-top">{it.name}</td>
                    <td className="py-1 pr-2 text-right align-top">{it.volume.toLocaleString('id-ID')}</td>
                    <td className="py-1 pr-2 align-top">{it.unit}</td>
                    <td className="py-1 pr-2 text-right align-top">{formatRupiah(it.unit_price)}</td>
                    <td className="py-1 text-right align-top">{formatRupiah(it.volume * it.unit_price)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">Belum ada item RAB pada proyek ini.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <table className="w-64 text-xs">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500">Subtotal</td>
                <td className="py-1 text-right font-medium text-slate-800">{formatRupiah(subtotal)}</td>
              </tr>
              {quotation.discount_percent > 0 && (
                <tr>
                  <td className="py-1 text-slate-500">Diskon ({quotation.discount_percent}%)</td>
                  <td className="py-1 text-right text-slate-800">-{formatRupiah(discount)}</td>
                </tr>
              )}
              <tr>
                <td className="py-1 text-slate-500">PPN ({project.ppn_percent}%)</td>
                <td className="py-1 text-right text-slate-800">{formatRupiah(ppn)}</td>
              </tr>
              <tr className="border-t border-slate-400">
                <td className="py-1.5 font-semibold text-slate-900">Total Penawaran</td>
                <td className="py-1.5 text-right font-semibold text-slate-900">{formatRupiah(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 whitespace-pre-line text-slate-700">{quotation.closing_notes || defaultClosing}</p>
        {quotation.valid_until && (
          <p className="mt-2 text-xs text-slate-500">Penawaran ini berlaku sampai dengan {formatTanggalIndo(quotation.valid_until)}.</p>
        )}

        <div className="mt-12 flex justify-end">
          <div className="text-center text-sm">
            <p>Hormat kami,</p>
            <div className="mt-16 border-t border-slate-400 pt-1">
              ( {companyProfile?.company_name || 'Nama Perusahaan Anda'} )
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

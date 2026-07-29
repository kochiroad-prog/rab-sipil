import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type {
  CompanyProfile,
  LabourTermin,
  ManpowerSpk,
  ManpowerSpkClause,
  ManpowerSpkItem,
  Project,
  SpkApproverRole,
  SpkClauseTemplate,
} from '@/types/database'
import PrintButton from '@/components/PrintButton'
import SpkApprovalForm from '@/components/SpkApprovalForm'
import {
  updateSpkHeader,
  addSpkItem,
  deleteSpkItem,
  addClause,
  deleteClause,
  saveClauseAsTemplate,
  addClauseFromTemplate,
  addTermin,
  deleteTermin,
  agreeSpk,
  updateSpkStatus,
} from '../actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  agreed: 'Disepakati',
  in_progress: 'Berjalan',
  done: 'Selesai',
  cancelled: 'Dibatalkan',
}

const APPROVER_ROLES: { role: SpkApproverRole; label: string }[] = [
  { role: 'pemborong', label: 'Pemborong' },
  { role: 'project_manager', label: 'Project Manager' },
  { role: 'designer', label: 'Designer' },
  { role: 'pengawas', label: 'Pengawas' },
  { role: 'admin', label: 'Admin' },
  { role: 'finance', label: 'Finance' },
  { role: 'spv_sales', label: 'SPV Sales' },
]

export default async function SpkDetailPage({
  params,
}: {
  params: Promise<{ id: string; spkId: string }>
}) {
  const { id, spkId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single<Project>()
  if (!project) notFound()

  const { data: spk } = await supabase.from('manpower_spk').select('*').eq('id', spkId).single<ManpowerSpk>()
  if (!spk) notFound()

  const { data: itemsRaw } = await supabase
    .from('manpower_spk_items')
    .select('*')
    .eq('spk_id', spkId)
    .order('sort', { ascending: true })
    .returns<ManpowerSpkItem[]>()
  const items = itemsRaw ?? []

  const { data: clausesRaw } = await supabase
    .from('manpower_spk_clauses')
    .select('*')
    .eq('spk_id', spkId)
    .order('sort', { ascending: true })
    .returns<ManpowerSpkClause[]>()
  const clauses = clausesRaw ?? []

  const { data: terminsRaw } = await supabase
    .from('labour_termins')
    .select('*')
    .eq('spk_id', spkId)
    .order('sort', { ascending: true })
    .returns<LabourTermin[]>()
  const termins = terminsRaw ?? []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .eq('owner_id', user?.id ?? '')
    .maybeSingle<CompanyProfile>()
  const { data: templatesRaw } = await supabase
    .from('spk_clause_templates')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<SpkClauseTemplate[]>()
  const templates = templatesRaw ?? []

  const locked = spk.status !== 'draft'

  return (
    <div className="space-y-6">
      <div className="print:hidden flex items-center justify-between">
        <Link href={`/projects/${id}/manpower/spk`} className="text-sm text-blue-700 hover:underline">
          &larr; Kembali ke Daftar SPK
        </Link>
        <div className="flex items-center gap-2">
          {spk.status === 'draft' ? (
            <form action={agreeSpk}>
              <input type="hidden" name="id" value={spk.id} />
              <input type="hidden" name="project_id" value={id} />
              <button className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800">
                Setujui &amp; Kunci
              </button>
            </form>
          ) : (
            <form action={updateSpkStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={spk.id} />
              <input type="hidden" name="project_id" value={id} />
              <select name="status" defaultValue={spk.status} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {Object.entries(STATUS_LABEL).filter(([v]) => v !== 'draft').map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                Update Status
              </button>
            </form>
          )}
          <PrintButton label="Cetak SPK" />
        </div>
      </div>

      {/* Dokumen SPK (printable) */}
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-sm print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{companyProfile?.company_name || 'Nama Perusahaan Anda'}</p>
            {companyProfile?.address && <p className="text-xs text-slate-500">{companyProfile.address}</p>}
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>No: {spk.spk_number}</p>
            <p>{spk.spk_date}</p>
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{STATUS_LABEL[spk.status] ?? spk.status}</span>
          </div>
        </div>

        <h2 className="mt-4 text-center font-semibold uppercase tracking-wide text-slate-900">
          Surat Perintah Kerja
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">Proyek: {project.name}</p>

        <table className="mt-4 w-full text-xs">
          <tbody>
            <tr><td className="w-40 py-1 text-slate-500">Klien/Proyek</td><td className="py-1">: {spk.client_name ?? '-'}</td></tr>
            <tr><td className="py-1 text-slate-500">Pemborong</td><td className="py-1">: {spk.worker_name ?? '-'} {spk.worker_phone ? `(${spk.worker_phone})` : ''}</td></tr>
            <tr><td className="py-1 text-slate-500">Durasi</td><td className="py-1">: {spk.start_date ?? '-'} s/d {spk.end_date ?? '-'}</td></tr>
          </tbody>
        </table>

        <table className="mt-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left text-slate-600">
              <th className="py-1.5 pr-2">No</th>
              <th className="py-1.5 pr-2">Uraian Pekerjaan</th>
              <th className="py-1.5 pr-2 text-right">Qty</th>
              <th className="py-1.5 pr-2">Sat</th>
              <th className="py-1.5 pr-2 text-right">Harga</th>
              <th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} className="border-b border-slate-100">
                <td className="py-1 pr-2">{idx + 1}</td>
                <td className="py-1 pr-2">{it.description}</td>
                <td className="py-1 pr-2 text-right">{it.qty}</td>
                <td className="py-1 pr-2">{it.unit}</td>
                <td className="py-1 pr-2 text-right">{formatRupiah(it.price)}</td>
                <td className="py-1 text-right">{formatRupiah(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex justify-end text-sm font-semibold text-slate-900">
          GRAND TOTAL: {formatRupiah(spk.grand_total)}
        </div>

        {termins.length > 0 && (
          <>
            <h3 className="mt-6 font-medium text-slate-800">Jadwal Termin</h3>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-400 text-left text-slate-600">
                  <th className="py-1.5 pr-2">Termin</th>
                  <th className="py-1.5 pr-2 text-right">Jumlah</th>
                  <th className="py-1.5 pr-2">Status</th>
                  <th className="py-1.5">Paraf</th>
                </tr>
              </thead>
              <tbody>
                {termins.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="py-1 pr-2">{t.description}</td>
                    <td className="py-1 pr-2 text-right">{formatRupiah(t.amount)}</td>
                    <td className="py-1 pr-2">{t.status === 'paid' ? 'Lunas' : 'Pending'}</td>
                    <td className="py-1">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h3 className="mt-6 font-medium text-slate-800">Klausul Komitmen</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs text-slate-700">
          {clauses.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.title}</span> — {c.body}
            </li>
          ))}
        </ol>

        {spk.sanksi_text && (
          <div className="mt-4 text-xs text-slate-700">
            <p className="font-medium text-slate-800">Sanksi</p>
            <p className="whitespace-pre-line">{spk.sanksi_text}</p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {APPROVER_ROLES.map(({ role, label }) => {
            const a = spk.approvals?.[role]
            return (
              <div key={role} className="text-center text-xs">
                <p className="text-slate-500">{label}</p>
                {a?.signature_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.signature_url} alt="TTD" className="mx-auto h-12 object-contain" />
                ) : (
                  <div className="h-12" />
                )}
                <div className="border-t border-slate-400 pt-1">({a?.name || '.....................'})</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Editor (tidak tercetak) */}
      <div className="print:hidden space-y-6">
        {!locked && (
          <form action={updateSpkHeader} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-medium text-slate-900">Edit Data SPK</h3>
            <input type="hidden" name="id" value={spk.id} />
            <input type="hidden" name="project_id" value={id} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input name="client_name" defaultValue={spk.client_name ?? ''} placeholder="Klien/Proyek" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
              <input name="worker_name" defaultValue={spk.worker_name ?? ''} placeholder="Nama pemborong" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
              <input name="worker_phone" defaultValue={spk.worker_phone ?? ''} placeholder="No. HP" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
              <input name="spk_date" type="date" defaultValue={spk.spk_date} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
              <input name="start_date" type="date" defaultValue={spk.start_date ?? ''} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
              <input name="end_date" type="date" defaultValue={spk.end_date ?? ''} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
              <textarea name="sanksi_text" defaultValue={spk.sanksi_text ?? ''} placeholder="Sanksi (opsional)" rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-4" />
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
                Simpan
              </button>
            </div>
          </form>
        )}

        <div>
          <h3 className="mb-2 font-medium text-slate-900">Item Pekerjaan</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Uraian</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Sat</th>
                  <th className="px-4 py-2 text-right font-medium">Harga</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2">{it.description}</td>
                    <td className="px-4 py-2 text-right">{it.qty}</td>
                    <td className="px-4 py-2">{it.unit}</td>
                    <td className="px-4 py-2 text-right">{formatRupiah(it.price)}</td>
                    <td className="px-4 py-2 text-right">{formatRupiah(it.total)}</td>
                    <td className="px-4 py-2 text-right">
                      {!locked && (
                        <form action={deleteSpkItem} className="inline">
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="spk_id" value={spk.id} />
                          <input type="hidden" name="project_id" value={id} />
                          <button className="text-xs text-red-600 hover:underline">Hapus</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!locked && (
            <form action={addSpkItem} className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-5">
              <input type="hidden" name="spk_id" value={spk.id} />
              <input type="hidden" name="project_id" value={id} />
              <input name="description" required placeholder="Uraian pekerjaan" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
              <input name="qty" type="number" step="0.01" defaultValue={1} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              <input name="unit" placeholder="Satuan" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              <div className="flex gap-2">
                <input name="price" type="number" step="1" placeholder="Harga" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">Tambah</button>
              </div>
            </form>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">Klausul Komitmen</h3>
          <div className="space-y-2">
            {clauses.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{c.title}</p>
                  <p className="text-slate-600">{c.body}</p>
                </div>
                {!locked && (
                  <div className="flex shrink-0 gap-2">
                    <form action={saveClauseAsTemplate}>
                      <input type="hidden" name="title" value={c.title ?? ''} />
                      <input type="hidden" name="body" value={c.body ?? ''} />
                      <input type="hidden" name="project_id" value={id} />
                      <input type="hidden" name="spk_id" value={spk.id} />
                      <button className="text-xs text-blue-700 hover:underline">Simpan sbg Template</button>
                    </form>
                    <form action={deleteClause}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="spk_id" value={spk.id} />
                      <input type="hidden" name="project_id" value={id} />
                      <button className="text-xs text-red-600 hover:underline">Hapus</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
          {!locked && (
            <div className="mt-2 space-y-2">
              <form action={addClause} className="grid grid-cols-1 gap-2 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-4">
                <input type="hidden" name="spk_id" value={spk.id} />
                <input type="hidden" name="project_id" value={id} />
                <input name="title" placeholder="Judul klausul" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-1" />
                <input name="body" placeholder="Isi klausul" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">Tambah Klausul</button>
              </form>
              {templates.length > 0 && (
                <form action={addClauseFromTemplate} className="flex items-center gap-2">
                  <input type="hidden" name="spk_id" value={spk.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <select name="template_id" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                    <option value="">-- Pilih dari library klausul --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <button className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">Tambahkan</button>
                </form>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">Termin Pembayaran</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Deskripsi</th>
                  <th className="px-4 py-2 text-right font-medium">Jumlah</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {termins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-slate-500">Belum ada termin.</td>
                  </tr>
                )}
                {termins.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className="px-4 py-2 text-right">{formatRupiah(t.amount)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {t.status === 'paid' ? 'Lunas' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteTermin} className="inline">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="spk_id" value={spk.id} />
                        <input type="hidden" name="project_id" value={id} />
                        <button className="text-xs text-red-600 hover:underline">Hapus</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={addTermin} className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-slate-300 p-3 sm:grid-cols-4">
            <input type="hidden" name="spk_id" value={spk.id} />
            <input type="hidden" name="project_id" value={id} />
            <input type="hidden" name="worker_name" value={spk.worker_name ?? ''} />
            <input name="description" required placeholder="mis. Termin 1 / DP / Retensi" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2" />
            <input name="amount" type="number" step="1" required placeholder="Jumlah" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">Tambah Termin</button>
          </form>
          <p className="mt-1 text-xs text-slate-400">
            Pembayaran termin dilakukan lewat menu{' '}
            <Link href="/upah-kerja" className="underline">Upah Kerja</Link> setelah SPK disepakati.
          </p>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-slate-900">Tanda Tangan Penyetuju</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {APPROVER_ROLES.map(({ role, label }) => (
              <SpkApprovalForm
                key={role}
                spkId={spk.id}
                projectId={id}
                role={role}
                label={label}
                existing={spk.approvals?.[role]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

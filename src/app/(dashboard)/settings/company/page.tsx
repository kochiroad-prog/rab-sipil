import { createClient } from '@/lib/supabase/server'
import type { CompanyProfile } from '@/types/database'
import { updateCompanyProfile } from './actions'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('company_profile')
    .select('*')
    .eq('owner_id', user?.id ?? '')
    .maybeSingle<CompanyProfile>()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Profil Perusahaan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Digunakan sebagai kop surat pada dokumen Surat Penawaran (Quotation).
        </p>
      </div>

      <form action={updateCompanyProfile} className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label className="text-xs text-slate-500">Nama Perusahaan</label>
          <input name="company_name" defaultValue={profile?.company_name ?? ''} placeholder="CV/PT Anda" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Alamat</label>
          <textarea name="address" defaultValue={profile?.address ?? ''} rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Telepon</label>
            <input name="phone" defaultValue={profile?.phone ?? ''} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Email</label>
            <input name="email" type="email" defaultValue={profile?.email ?? ''} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Simpan
        </button>
      </form>
    </div>
  )
}

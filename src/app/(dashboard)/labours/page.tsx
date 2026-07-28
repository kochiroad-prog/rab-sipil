import { createClient } from '@/lib/supabase/server'
import type { Labour, WorkActivity } from '@/types/database'
import { addLabour, deleteLabour, addWorkActivity, deleteWorkActivity } from './actions'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const SKILL_LABEL: Record<string, string> = {
  tukang_batu: 'Tukang Batu',
  tukang_besi: 'Tukang Besi',
  tukang_kayu: 'Tukang Kayu',
  tukang_cat: 'Tukang Cat',
  mandor: 'Mandor',
  operator_alat: 'Operator Alat',
  helper: 'Helper',
  lainnya: 'Lainnya',
}

export default async function LaboursPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: labours } = await supabase.from('labours').select('*').order('kategori').returns<Labour[]>()
  const { data: activities } = await supabase
    .from('work_activities')
    .select('*')
    .order('kategori_pekerjaan')
    .returns<WorkActivity[]>()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Labour DB &amp; Work Activities</h1>
        <p className="mt-1 text-sm text-slate-500">
          Dipakai AI Manpower Engine untuk menyusun rencana tim per proyek.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium text-slate-900">Tenaga Kerja</h2>
        <form action={addLabour} className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-6">
          <select name="kategori" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" defaultValue="tukang_batu">
            {Object.entries(SKILL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="level" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" defaultValue="regular">
            <option value="junior">Junior</option>
            <option value="regular">Regular</option>
            <option value="senior">Senior</option>
            <option value="expert">Expert</option>
          </select>
          <input name="name" required placeholder="Nama" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="daily_rate" type="number" step="1000" required placeholder="Upah harian" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
        </form>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 text-right font-medium">Upah Harian</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(labours ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada data.</td></tr>
              )}
              {(labours ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-500">{SKILL_LABEL[l.kategori]}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{l.level}</td>
                  <td className="px-4 py-3 text-slate-900">{l.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(l.daily_rate)}</td>
                  <td className="px-4 py-3 text-right">
                    {l.owner_id === user?.id && (
                      <form action={deleteLabour}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="text-xs text-red-600 hover:underline">Hapus</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-slate-900">Work Activities (Produktivitas)</h2>
        <form action={addWorkActivity} className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-6">
          <input name="kategori_pekerjaan" required placeholder="Kategori pekerjaan" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input name="activity_name" required placeholder="Nama aktivitas" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <select name="skill_kategori" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" defaultValue="tukang_batu">
            {Object.entries(SKILL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="unit" required placeholder="Satuan (m3/hari)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <input name="productivity_rate" type="number" step="0.01" required placeholder="Rate" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:col-span-1">
            Tambah
          </button>
        </form>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Kategori Pekerjaan</th>
                <th className="px-4 py-3 font-medium">Aktivitas</th>
                <th className="px-4 py-3 font-medium">Skill</th>
                <th className="px-4 py-3 text-right font-medium">Produktivitas</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activities ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada data.</td></tr>
              )}
              {(activities ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-slate-500">{a.kategori_pekerjaan}</td>
                  <td className="px-4 py-3 text-slate-900">{a.activity_name}</td>
                  <td className="px-4 py-3 text-slate-600">{SKILL_LABEL[a.skill_kategori]}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{a.productivity_rate} {a.unit}</td>
                  <td className="px-4 py-3 text-right">
                    {a.owner_id === user?.id && (
                      <form action={deleteWorkActivity}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-xs text-red-600 hover:underline">Hapus</button>
                      </form>
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

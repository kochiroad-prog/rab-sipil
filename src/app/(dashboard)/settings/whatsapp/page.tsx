import { createClient } from '@/lib/supabase/server'
import type { WaEventSetting, WaLog, WaSettings } from '@/types/database'
import { WA_EVENTS } from '@/lib/wa-notify'
import { updateWaSettings, updateEventSetting, testWaConnection, retryQueueForOwner } from './actions'

export default async function WhatsappSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: settings } = await supabase
    .from('wa_settings')
    .select('*')
    .eq('owner_id', user?.id ?? '')
    .maybeSingle<WaSettings>()

  const { data: eventsRaw } = await supabase
    .from('wa_event_settings')
    .select('*')
    .eq('owner_id', user?.id ?? '')
    .returns<WaEventSetting[]>()
  const eventByKey = new Map((eventsRaw ?? []).map((e) => [e.event_key, e]))

  const { data: logsRaw } = await supabase
    .from('wa_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15)
    .returns<WaLog[]>()
  const logs = logsRaw ?? []

  const { count: pendingCount } = await supabase
    .from('wa_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notifikasi WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-500">
          Instance terpisah dari RAB Estima — gunakan nama instance Evolution API yang berbeda supaya notifikasi kedua aplikasi tidak tercampur.
        </p>
      </div>

      <form action={updateWaSettings} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">Pengaturan Koneksi</h3>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="enabled" defaultChecked={settings?.enabled ?? false} />
            Aktifkan Notifikasi
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input name="api_url" defaultValue={settings?.api_url ?? ''} placeholder="URL Evolution API (mis. http://43.156.178.123:8080)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="api_key" defaultValue={settings?.api_key ?? ''} placeholder="API Key" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input name="instance" defaultValue={settings?.instance ?? ''} placeholder="Nama Instance (case-sensitive, beda dari RAB Estima)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select name="api_version" defaultValue={settings?.api_version ?? 'auto'} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="auto">Auto-detect</option>
            <option value="v2">v2</option>
            <option value="v1">v1</option>
          </select>
          <input name="target_number" defaultValue={settings?.target_number ?? ''} placeholder="No. WA tujuan notifikasi (mis. 08123456789)" className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        </div>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Simpan
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
        <form action={testWaConnection}>
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Test Koneksi
          </button>
        </form>
        <form action={retryQueueForOwner}>
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Kirim Ulang Antrean {pendingCount ? `(${pendingCount})` : ''}
          </button>
        </form>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Event Notifikasi</h3>
        <div className="space-y-2">
          {WA_EVENTS.map((e) => {
            const cur = eventByKey.get(e.key)
            return (
              <form key={e.key} action={updateEventSetting} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <input type="hidden" name="event_key" value={e.key} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enabled" defaultChecked={cur?.enabled ?? true} />
                  {e.label}
                </label>
                <input
                  name="target_number"
                  defaultValue={cur?.target_number ?? ''}
                  placeholder="Override nomor (opsional)"
                  className="ml-auto w-56 rounded-md border border-slate-300 px-2 py-1 text-xs"
                />
                <button className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100">
                  Simpan
                </button>
              </form>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-slate-900">Log Terbaru</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Belum ada log.</td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-500">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-slate-900">{l.event_key}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${l.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {l.status === 'sent' ? 'Terkirim' : 'Gagal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.response ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

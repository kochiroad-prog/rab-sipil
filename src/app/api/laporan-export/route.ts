import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLaporanWorkbook, type LaporanRow } from '@/lib/export-laporan'
import type { Project, RabItem, PurchaseOrder, ManpowerSpk, LabourTermin } from '@/types/database'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: projectsRaw } = await supabase.from('projects').select('*').order('name').returns<Project[]>()
  const projects = projectsRaw ?? []

  const { data: rabItemsRaw } = await supabase.from('rab_items').select('*').returns<RabItem[]>()
  const rabItems = rabItemsRaw ?? []

  const { data: posRaw } = await supabase.from('purchase_orders').select('*').eq('status', 'paid').returns<PurchaseOrder[]>()
  const paidPOs = posRaw ?? []

  const { data: spksRaw } = await supabase.from('manpower_spk').select('*').returns<ManpowerSpk[]>()
  const spks = spksRaw ?? []
  const spkProjectById = new Map(spks.map((s) => [s.id, s.project_id]))

  let paidTermins: LabourTermin[] = []
  if (spks.length > 0) {
    const { data: terminsRaw } = await supabase
      .from('labour_termins')
      .select('*')
      .eq('status', 'paid')
      .in('spk_id', spks.map((s) => s.id))
      .returns<LabourTermin[]>()
    paidTermins = terminsRaw ?? []
  }

  const rows: LaporanRow[] = projects.map((p) => {
    const items = rabItems.filter((it) => it.project_id === p.id)
    const subtotal = items.reduce((s, it) => s + it.volume * it.unit_price, 0)
    const nilaiKontrak = subtotal * (1 + p.ppn_percent / 100)

    const realisasiMaterial = paidPOs.filter((po) => po.project_id === p.id).reduce((s, po) => s + po.total_amount, 0)
    const realisasiUpah = paidTermins
      .filter((t) => t.spk_id && spkProjectById.get(t.spk_id) === p.id)
      .reduce((s, t) => s + t.amount, 0)

    const totalRealisasi = realisasiMaterial + realisasiUpah
    const profit = nilaiKontrak - totalRealisasi
    const marginPct = nilaiKontrak > 0 ? (profit / nilaiKontrak) * 100 : 0

    return {
      projectName: p.name,
      status: p.status,
      nilaiKontrak,
      realisasiMaterial,
      realisasiUpah,
      totalRealisasi,
      profit,
      marginPct,
    }
  })

  const wb = buildLaporanWorkbook(rows)
  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Laporan_Finansial.xlsx"',
    },
  })
}

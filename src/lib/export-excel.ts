import ExcelJS from 'exceljs'
import type { Project, RabItem, AhspItem, AhspComponent } from '@/types/database'

const HEADER_FONT = { bold: true }
const TITLE_FONT = { bold: true, size: 14 }
const CURRENCY_FMT = '#,##0'

function f(formula: string) {
  return { formula }
}

export type AhspDetail = { item: AhspItem; components: AhspComponent[] }

const COMPONENT_LABEL: Record<string, string> = { labor: 'TENAGA', material: 'BAHAN', equipment: 'PERALATAN' }
const HSD_SHEET_BY_TYPE: Record<string, string> = { labor: 'HSD Upah', material: 'HSD Bahan', equipment: 'HSD Alat' }

export function buildRabWorkbook(project: Project, rabItems: RabItem[], ahspDetails: AhspDetail[] = []) {
  // ---------- kelompokkan per section, urutan sesuai kemunculan pertama ----------
  const sections: { name: string; items: RabItem[] }[] = []
  const sectionIndex = new Map<string, number>()
  for (const it of rabItems) {
    const name = (it.section ?? 'PEKERJAAN LAIN-LAIN').toUpperCase()
    if (!sectionIndex.has(name)) {
      sectionIndex.set(name, sections.length)
      sections.push({ name, items: [] })
    }
    sections[sectionIndex.get(name)!].items.push(it)
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Estimator Sipil & Konstruksi'
  wb.created = new Date()

  // ================= SHEET: Informasi =================
  const wsInfo = wb.addWorksheet('Informasi')
  wsInfo.getColumn(1).width = 22
  wsInfo.getColumn(2).width = 70
  const infoRows: [string, string | number][] = [
    ['Nama Proyek', project.name],
    ['Klien / Instansi', project.client_name ?? '-'],
    ['Lokasi', project.location ?? '-'],
    ['Tahun Anggaran', project.tahun_anggaran ?? '-'],
    ['PPN (%)', project.ppn_percent],
    ['Overhead & Profit (%)', project.overhead_percent],
  ]
  infoRows.forEach(([label, val], i) => {
    const row = i + 1
    wsInfo.getCell(`A${row}`).value = label
    wsInfo.getCell(`A${row}`).font = HEADER_FONT
    wsInfo.getCell(`B${row}`).value = val
  })
  wsInfo.getCell('A8').value = 'Catatan'
  wsInfo.getCell('A8').font = HEADER_FONT
  wsInfo.getCell('B8').value =
    'Harga satuan pada dokumen ini adalah harga all-in (sudah termasuk profit) sesuai yang diisi pengguna di aplikasi, ' +
    'kecuali item yang memakai rincian komposisi AHSP (bahan/upah/alat) tersendiri — item tsb otomatis mengambil harga dari sheet AHSP/HSD. ' +
    'Nilai TKDN pada sheet "Rekapitulasi TKDN" adalah estimasi rata-rata tertimbang dari %TKDN per item — ' +
    'bukan perhitungan resmi Nilai Gabungan Barang & Jasa sesuai Permen PUPR. Untuk keperluan tender, verifikasi ulang manual.'
  wsInfo.getCell('B8').alignment = { wrapText: true }
  wsInfo.getRow(8).height = 60

  // ================= SHEET: HSD Upah / HSD Bahan / HSD Alat (kalau ada komposisi) =================
  // componentRowRef: key `${type}::${name}::${unit}` -> { sheet, row }
  const componentRowRef = new Map<string, { sheet: string; row: number }>()
  const hasComponents = ahspDetails.some((d) => d.components.length > 0)

  if (hasComponents) {
    const byType: Record<string, { name: string; unit: string; price: number; tkdn: number }[]> = {
      labor: [],
      material: [],
      equipment: [],
    }
    const seen = new Set<string>()
    for (const d of ahspDetails) {
      for (const c of d.components) {
        const key = `${c.component_type}::${c.name}::${c.unit}`
        if (seen.has(key)) continue
        seen.add(key)
        byType[c.component_type]?.push({ name: c.name, unit: c.unit, price: c.unit_price, tkdn: c.tkdn_percent })
      }
    }

    const sheetTitles: Record<string, string> = {
      labor: 'HARGA SATUAN DASAR UPAH',
      material: 'HARGA SATUAN DASAR BAHAN',
      equipment: 'HARGA SATUAN DASAR ALAT',
    }

    for (const type of ['labor', 'material', 'equipment'] as const) {
      const sheetName = HSD_SHEET_BY_TYPE[type]
      const ws = wb.addWorksheet(sheetName)
      ws.columns = [{ width: 6 }, { width: 40 }, { width: 8 }, { width: 18 }, { width: 10 }]
      ws.getCell('A1').value = sheetTitles[type]
      ws.getCell('A1').font = TITLE_FONT
      ws.getCell('A3').value = 'No'
      ws.getCell('B3').value = 'Nama Item'
      ws.getCell('C3').value = 'Sat'
      ws.getCell('D3').value = 'Harga Dasar (Rp)'
      ws.getCell('E3').value = '% TKDN'
      ws.getRow(3).font = HEADER_FONT

      byType[type].forEach((row, i) => {
        const r = i + 4
        ws.getCell(`A${r}`).value = i + 1
        ws.getCell(`B${r}`).value = row.name
        ws.getCell(`C${r}`).value = row.unit
        ws.getCell(`D${r}`).value = row.price
        ws.getCell(`D${r}`).numFmt = CURRENCY_FMT
        ws.getCell(`E${r}`).value = row.tkdn
        componentRowRef.set(`${type}::${row.name}::${row.unit}`, { sheet: sheetName, row: r })
      })
    }
  }

  // ================= SHEET: AHSP (kalau ada komposisi) =================
  const ahspFinalRow = new Map<string, number>() // ahsp_item_id -> row G harga satuan pekerjaan
  if (hasComponents) {
    const wsAhsp = wb.addWorksheet('AHSP')
    wsAhsp.columns = [
      { width: 6 }, { width: 34 }, { width: 10 }, { width: 8 }, { width: 12 }, { width: 16 }, { width: 18 }, { width: 18 },
    ]
    wsAhsp.getCell('A1').value = 'ANALISA HARGA SATUAN PEKERJAAN'
    wsAhsp.getCell('A1').font = TITLE_FONT

    let ar = 3
    for (const detail of ahspDetails) {
      if (detail.components.length === 0) continue
      const { item, components } = detail

      wsAhsp.getCell(`B${ar}`).value = 'URAIAN PEKERJAAN'
      wsAhsp.getCell(`C${ar}`).value = `: ${item.name}`
      ar++
      wsAhsp.getCell(`B${ar}`).value = 'KODE'
      wsAhsp.getCell(`C${ar}`).value = `: ${item.code ?? '-'}`
      ar++
      wsAhsp.getCell(`B${ar}`).value = 'SATUAN'
      wsAhsp.getCell(`C${ar}`).value = `: ${item.unit}`
      ar++

      const headerR = ar
      ;['No', 'Uraian', 'Satuan', 'Koefisien', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)', 'Jumlah TKDN (Rp)'].forEach((h, i) => {
        const cell = wsAhsp.getCell(headerR, i + 1)
        cell.value = h
        cell.font = HEADER_FONT
      })
      ar++

      const typeSubtotalRows: Record<string, number> = {}
      const letters = 'ABC'
      let letterIdx = 0

      for (const type of ['labor', 'material', 'equipment'] as const) {
        const rows = components.filter((c) => c.component_type === type)
        if (rows.length === 0) continue

        wsAhsp.getCell(`A${ar}`).value = letters[letterIdx]
        wsAhsp.getCell(`B${ar}`).value = COMPONENT_LABEL[type]
        wsAhsp.getCell(`A${ar}`).font = HEADER_FONT
        wsAhsp.getCell(`B${ar}`).font = HEADER_FONT
        ar++

        const firstRow = ar
        for (const c of rows) {
          const ref = componentRowRef.get(`${type}::${c.name}::${c.unit}`)
          wsAhsp.getCell(`B${ar}`).value = c.name
          wsAhsp.getCell(`C${ar}`).value = c.unit
          wsAhsp.getCell(`D${ar}`).value = c.coefficient
          if (ref) {
            wsAhsp.getCell(`E${ar}`).value = f(`'${ref.sheet}'!D${ref.row}`)
          } else {
            wsAhsp.getCell(`E${ar}`).value = c.unit_price
          }
          wsAhsp.getCell(`E${ar}`).numFmt = CURRENCY_FMT
          wsAhsp.getCell(`F${ar}`).value = f(`D${ar}*E${ar}`)
          wsAhsp.getCell(`F${ar}`).numFmt = CURRENCY_FMT
          if (ref) {
            wsAhsp.getCell(`G${ar}`).value = f(`F${ar}*('${ref.sheet}'!E${ref.row}/100)`)
          } else {
            wsAhsp.getCell(`G${ar}`).value = f(`F${ar}*(${c.tkdn_percent}/100)`)
          }
          wsAhsp.getCell(`G${ar}`).numFmt = CURRENCY_FMT
          ar++
        }
        const lastRow = ar - 1
        wsAhsp.getCell(`B${ar}`).value = `JUMLAH HARGA ${COMPONENT_LABEL[type]}`
        wsAhsp.getCell(`F${ar}`).value = f(`SUM(F${firstRow}:F${lastRow})`)
        wsAhsp.getCell(`F${ar}`).numFmt = CURRENCY_FMT
        wsAhsp.getCell(`G${ar}`).value = f(`SUM(G${firstRow}:G${lastRow})`)
        wsAhsp.getCell(`G${ar}`).numFmt = CURRENCY_FMT
        typeSubtotalRows[type] = ar
        ar++
        letterIdx++
      }

      const jumlahRow = ar
      const parts = ['labor', 'material', 'equipment'].map((t) => typeSubtotalRows[t]).filter(Boolean)
      wsAhsp.getCell(`A${jumlahRow}`).value = letters[letterIdx]
      wsAhsp.getCell(`B${jumlahRow}`).value = 'JUMLAH (A+B+C)'
      wsAhsp.getCell(`F${jumlahRow}`).value = f(parts.map((r) => `F${r}`).join('+') || '0')
      wsAhsp.getCell(`F${jumlahRow}`).numFmt = CURRENCY_FMT
      wsAhsp.getCell(`G${jumlahRow}`).value = f(parts.map((r) => `G${r}`).join('+') || '0')
      wsAhsp.getCell(`G${jumlahRow}`).numFmt = CURRENCY_FMT
      letterIdx++
      ar++

      const overheadRow = ar
      wsAhsp.getCell(`A${overheadRow}`).value = letters[letterIdx]
      wsAhsp.getCell(`B${overheadRow}`).value = f(`"OVERHEAD & PROFIT ("&Informasi!B6&"%)"`)
      wsAhsp.getCell(`F${overheadRow}`).value = f(`F${jumlahRow}*(Informasi!B6/100)`)
      wsAhsp.getCell(`F${overheadRow}`).numFmt = CURRENCY_FMT
      wsAhsp.getCell(`G${overheadRow}`).value = f(
        `IF(F${jumlahRow}>0,F${overheadRow}*(G${jumlahRow}/F${jumlahRow}),0)`
      )
      wsAhsp.getCell(`G${overheadRow}`).numFmt = CURRENCY_FMT
      letterIdx++
      ar++

      const finalRow = ar
      wsAhsp.getCell(`A${finalRow}`).value = letters[letterIdx]
      wsAhsp.getCell(`B${finalRow}`).value = 'HARGA SATUAN PEKERJAAN'
      wsAhsp.getCell(`F${finalRow}`).value = f(`F${jumlahRow}+F${overheadRow}`)
      wsAhsp.getCell(`F${finalRow}`).numFmt = CURRENCY_FMT
      wsAhsp.getCell(`F${finalRow}`).font = HEADER_FONT
      wsAhsp.getCell(`G${finalRow}`).value = f(`G${jumlahRow}+G${overheadRow}`)
      wsAhsp.getCell(`G${finalRow}`).numFmt = CURRENCY_FMT
      wsAhsp.getCell(`G${finalRow}`).font = HEADER_FONT
      ar += 2

      ahspFinalRow.set(item.id, finalRow)
    }
  }

  // ================= SHEET: Rincian RAB =================
  const wsRab = wb.addWorksheet('Rincian RAB')
  wsRab.columns = [
    { width: 6 }, { width: 45 }, { width: 2 }, { width: 8 }, { width: 12 }, { width: 18 }, { width: 20 }, { width: 20 }, { width: 10 },
  ]
  wsRab.getCell('A1').value = 'RENCANA ANGGARAN BIAYA'
  wsRab.getCell('A1').font = TITLE_FONT
  wsRab.getCell('A3').value = 'Klien / Instansi'
  wsRab.getCell('C3').value = f('Informasi!B2')
  wsRab.getCell('A4').value = 'Nama Pekerjaan'
  wsRab.getCell('C4').value = f('Informasi!B1')
  wsRab.getCell('A5').value = 'Lokasi'
  wsRab.getCell('C5').value = f('Informasi!B3')
  wsRab.getCell('A6').value = 'Tahun Anggaran'
  wsRab.getCell('C6').value = f('Informasi!B4')
  ;['A3', 'A4', 'A5', 'A6'].forEach((c) => (wsRab.getCell(c).font = HEADER_FONT))

  const headerRow = 8
  const headers = [
    'No', 'Uraian Pekerjaan', '', 'Sat', 'Volume', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)', 'Jumlah Harga TKDN (Rp)', 'TKDN (%)',
  ]
  headers.forEach((h, i) => {
    const cell = wsRab.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = HEADER_FONT
  })

  let r = headerRow + 1
  const sectionSubtotalRows: { name: string; row: number }[] = []
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  sections.forEach((sec, sIdx) => {
    const secRow = r
    wsRab.getCell(`A${secRow}`).value = letters[sIdx % 26]
    wsRab.getCell(`B${secRow}`).value = sec.name
    wsRab.getCell(`A${secRow}`).font = HEADER_FONT
    wsRab.getCell(`B${secRow}`).font = HEADER_FONT
    r++

    const firstItemRow = r
    sec.items.forEach((it, itemIdx) => {
      wsRab.getCell(`A${r}`).value = itemIdx + 1
      wsRab.getCell(`B${r}`).value = it.name
      wsRab.getCell(`D${r}`).value = it.unit
      wsRab.getCell(`E${r}`).value = it.volume

      const ahspRow = it.ahsp_item_id ? ahspFinalRow.get(it.ahsp_item_id) : undefined
      if (ahspRow) {
        wsRab.getCell(`F${r}`).value = f(`AHSP!F${ahspRow}`)
      } else {
        wsRab.getCell(`F${r}`).value = it.unit_price
      }
      wsRab.getCell(`F${r}`).numFmt = CURRENCY_FMT
      wsRab.getCell(`G${r}`).value = f(`E${r}*F${r}`)
      wsRab.getCell(`G${r}`).numFmt = CURRENCY_FMT
      wsRab.getCell(`I${r}`).value = it.tkdn_percent
      wsRab.getCell(`H${r}`).value = f(`G${r}*(I${r}/100)`)
      wsRab.getCell(`H${r}`).numFmt = CURRENCY_FMT
      r++
    })
    const lastItemRow = r - 1

    wsRab.getCell(`A${r}`).value = `SUBTOTAL ${sec.name}`
    wsRab.getCell(`A${r}`).font = HEADER_FONT
    wsRab.getCell(`G${r}`).value = f(`SUBTOTAL(9,G${firstItemRow}:G${lastItemRow})`)
    wsRab.getCell(`G${r}`).numFmt = CURRENCY_FMT
    wsRab.getCell(`G${r}`).font = HEADER_FONT
    wsRab.getCell(`H${r}`).value = f(`SUBTOTAL(9,H${firstItemRow}:H${lastItemRow})`)
    wsRab.getCell(`H${r}`).numFmt = CURRENCY_FMT
    wsRab.getCell(`H${r}`).font = HEADER_FONT
    sectionSubtotalRows.push({ name: sec.name, row: r })
    r += 2
  })

  // ================= SHEET: Rekapitulasi =================
  const wsRekap = wb.addWorksheet('Rekapitulasi')
  wsRekap.columns = [{ width: 45 }, { width: 20 }, { width: 20 }]
  wsRekap.getCell('A1').value = 'RENCANA ANGGARAN BIAYA — REKAPITULASI'
  wsRekap.getCell('A1').font = TITLE_FONT
  wsRekap.getCell('A3').value = 'Klien / Instansi'
  wsRekap.getCell('B3').value = f('Informasi!B2')
  wsRekap.getCell('A4').value = 'Nama Pekerjaan'
  wsRekap.getCell('B4').value = f('Informasi!B1')
  wsRekap.getCell('A5').value = 'Lokasi'
  wsRekap.getCell('B5').value = f('Informasi!B3')
  wsRekap.getCell('A6').value = 'Tahun Anggaran'
  wsRekap.getCell('B6').value = f('Informasi!B4')
  ;['A3', 'A4', 'A5', 'A6'].forEach((c) => (wsRekap.getCell(c).font = HEADER_FONT))

  let rr = 8
  wsRekap.getCell(`A${rr}`).value = 'URAIAN PEKERJAAN'
  wsRekap.getCell(`B${rr}`).value = 'TOTAL HARGA (Rp)'
  wsRekap.getCell(`C${rr}`).value = 'TOTAL HARGA TKDN (Rp)'
  wsRekap.getRow(rr).font = HEADER_FONT
  rr++

  const recapStart = rr
  sectionSubtotalRows.forEach(({ name, row }) => {
    wsRekap.getCell(`A${rr}`).value = name
    wsRekap.getCell(`B${rr}`).value = f(`'Rincian RAB'!G${row}`)
    wsRekap.getCell(`B${rr}`).numFmt = CURRENCY_FMT
    wsRekap.getCell(`C${rr}`).value = f(`'Rincian RAB'!H${row}`)
    wsRekap.getCell(`C${rr}`).numFmt = CURRENCY_FMT
    rr++
  })
  const recapEnd = rr - 1

  const rowJumlah = rr
  wsRekap.getCell(`A${rowJumlah}`).value = '( A ) JUMLAH BIAYA'
  wsRekap.getCell(`B${rowJumlah}`).value = f(`SUM(B${recapStart}:B${recapEnd})`)
  wsRekap.getCell(`B${rowJumlah}`).numFmt = CURRENCY_FMT
  wsRekap.getCell(`C${rowJumlah}`).value = f(`SUM(C${recapStart}:C${recapEnd})`)
  wsRekap.getCell(`C${rowJumlah}`).numFmt = CURRENCY_FMT
  wsRekap.getRow(rowJumlah).font = HEADER_FONT
  rr++

  const rowPpn = rr
  wsRekap.getCell(`A${rowPpn}`).value = f(`"( B ) PPN = "&Informasi!B5&"% X (A)"`)
  wsRekap.getCell(`B${rowPpn}`).value = f(`B${rowJumlah}*(Informasi!B5/100)`)
  wsRekap.getCell(`B${rowPpn}`).numFmt = CURRENCY_FMT
  wsRekap.getCell(`C${rowPpn}`).value = f(`C${rowJumlah}*(Informasi!B5/100)`)
  wsRekap.getCell(`C${rowPpn}`).numFmt = CURRENCY_FMT
  rr++

  const rowTotal = rr
  wsRekap.getCell(`A${rowTotal}`).value = '( C ) JUMLAH TOTAL'
  wsRekap.getCell(`B${rowTotal}`).value = f(`B${rowJumlah}+B${rowPpn}`)
  wsRekap.getCell(`B${rowTotal}`).numFmt = CURRENCY_FMT
  wsRekap.getCell(`C${rowTotal}`).value = f(`C${rowJumlah}+C${rowPpn}`)
  wsRekap.getCell(`C${rowTotal}`).numFmt = CURRENCY_FMT
  rr++

  const rowBulat = rr
  wsRekap.getCell(`A${rowBulat}`).value = '( D ) DIBULATKAN (C)'
  wsRekap.getCell(`B${rowBulat}`).value = f(`ROUNDDOWN(B${rowTotal},-3)`)
  wsRekap.getCell(`B${rowBulat}`).numFmt = CURRENCY_FMT
  wsRekap.getCell(`B${rowBulat}`).font = HEADER_FONT
  wsRekap.getCell(`C${rowBulat}`).value = f(`ROUNDDOWN(C${rowTotal},-3)`)
  wsRekap.getCell(`C${rowBulat}`).numFmt = CURRENCY_FMT
  wsRekap.getCell(`C${rowBulat}`).font = HEADER_FONT
  rr += 2

  const rowTkdn = rr
  wsRekap.getCell(`A${rowTkdn}`).value = 'TKDN (estimasi rata-rata tertimbang)'
  wsRekap.getCell(`B${rowTkdn}`).value = f(`IF(B${rowBulat}>0,C${rowBulat}/B${rowBulat},0)`)
  wsRekap.getCell(`B${rowTkdn}`).numFmt = '0.0%'

  // ================= SHEET: Rekapitulasi TKDN =================
  const wsTkdn = wb.addWorksheet('Rekapitulasi TKDN')
  wsTkdn.columns = [{ width: 42 }, { width: 22 }, { width: 22 }, { width: 14 }]
  wsTkdn.getCell('A1').value = 'RINGKASAN TKDN PROYEK'
  wsTkdn.getCell('A1').font = TITLE_FONT
  wsTkdn.getCell('A2').value =
    'Estimasi rata-rata tertimbang dari %TKDN per item RAB — bukan perhitungan resmi Nilai Gabungan Barang & Jasa (Permen PUPR).'
  wsTkdn.getCell('A2').alignment = { wrapText: true }
  wsTkdn.getRow(2).height = 30

  let tr = 4
  wsTkdn.getCell(`A${tr}`).value = 'URAIAN PEKERJAAN'
  wsTkdn.getCell(`B${tr}`).value = 'TOTAL HARGA (Rp)'
  wsTkdn.getCell(`C${tr}`).value = 'TOTAL HARGA TKDN (Rp)'
  wsTkdn.getCell(`D${tr}`).value = '% TKDN'
  wsTkdn.getRow(tr).font = HEADER_FONT
  tr++

  sectionSubtotalRows.forEach(({ name }, idx) => {
    const rekapRow = recapStart + idx
    wsTkdn.getCell(`A${tr}`).value = name
    wsTkdn.getCell(`B${tr}`).value = f(`Rekapitulasi!B${rekapRow}`)
    wsTkdn.getCell(`B${tr}`).numFmt = CURRENCY_FMT
    wsTkdn.getCell(`C${tr}`).value = f(`Rekapitulasi!C${rekapRow}`)
    wsTkdn.getCell(`C${tr}`).numFmt = CURRENCY_FMT
    wsTkdn.getCell(`D${tr}`).value = f(`IF(B${tr}>0,C${tr}/B${tr},0)`)
    wsTkdn.getCell(`D${tr}`).numFmt = '0.0%'
    tr++
  })

  const grandRow = tr
  wsTkdn.getCell(`A${grandRow}`).value = 'TOTAL PROYEK (setelah PPN, dibulatkan)'
  wsTkdn.getCell(`A${grandRow}`).font = HEADER_FONT
  wsTkdn.getCell(`B${grandRow}`).value = f(`Rekapitulasi!B${rowBulat}`)
  wsTkdn.getCell(`B${grandRow}`).numFmt = CURRENCY_FMT
  wsTkdn.getCell(`C${grandRow}`).value = f(`Rekapitulasi!C${rowBulat}`)
  wsTkdn.getCell(`C${grandRow}`).numFmt = CURRENCY_FMT
  wsTkdn.getCell(`D${grandRow}`).value = f(`IF(B${grandRow}>0,C${grandRow}/B${grandRow},0)`)
  wsTkdn.getCell(`D${grandRow}`).numFmt = '0.0%'
  wsTkdn.getRow(grandRow).font = HEADER_FONT

  return wb
}

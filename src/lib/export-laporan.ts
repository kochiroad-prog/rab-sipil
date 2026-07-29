import ExcelJS from 'exceljs'

const HEADER_FONT = { bold: true }
const CURRENCY_FMT = '#,##0'

export type LaporanRow = {
  projectName: string
  status: string
  nilaiKontrak: number
  realisasiMaterial: number
  realisasiUpah: number
  totalRealisasi: number
  profit: number
  marginPct: number
}

export function buildLaporanWorkbook(rows: LaporanRow[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Estimator Sipil & Konstruksi'
  wb.created = new Date()

  const ws = wb.addWorksheet('Laporan')
  ;[34, 14, 18, 18, 18, 18, 16, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w))

  ws.getCell('A1').value = 'Laporan Finansial Lintas Proyek'
  ws.getCell('A1').font = { bold: true, size: 14 }

  const headerRow = 3
  const headers = ['Proyek', 'Status', 'Nilai Kontrak', 'Realisasi Material', 'Realisasi Upah', 'Total Realisasi', 'Profit', 'Margin %']
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = HEADER_FONT
  })

  let r = headerRow + 1
  for (const row of rows) {
    ws.getCell(r, 1).value = row.projectName
    ws.getCell(r, 2).value = row.status
    ws.getCell(r, 3).value = row.nilaiKontrak
    ws.getCell(r, 3).numFmt = CURRENCY_FMT
    ws.getCell(r, 4).value = row.realisasiMaterial
    ws.getCell(r, 4).numFmt = CURRENCY_FMT
    ws.getCell(r, 5).value = row.realisasiUpah
    ws.getCell(r, 5).numFmt = CURRENCY_FMT
    ws.getCell(r, 6).value = row.totalRealisasi
    ws.getCell(r, 6).numFmt = CURRENCY_FMT
    ws.getCell(r, 7).value = row.profit
    ws.getCell(r, 7).numFmt = CURRENCY_FMT
    ws.getCell(r, 8).value = Math.round(row.marginPct * 10) / 10
    r++
  }

  ws.getCell(r, 2).value = 'Total'
  ws.getCell(r, 2).font = HEADER_FONT
  ;[3, 4, 5, 6, 7].forEach((col) => {
    const colLetter = ws.getColumn(col).letter
    ws.getCell(r, col).value = { formula: `SUM(${colLetter}${headerRow + 1}:${colLetter}${r - 1})` }
    ws.getCell(r, col).numFmt = CURRENCY_FMT
    ws.getCell(r, col).font = HEADER_FONT
  })

  return wb
}

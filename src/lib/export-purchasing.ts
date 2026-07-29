import ExcelJS from 'exceljs'
import type { Project } from '@/types/database'
import type { PurchaseRow } from '@/lib/takeoff-sipil'

const HEADER_FONT = { bold: true }
const CURRENCY_FMT = '#,##0'

export function buildPurchasingWorkbook(project: Project, rows: PurchaseRow[]) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Estimator Sipil & Konstruksi'
  wb.created = new Date()

  const ws = wb.addWorksheet('Purchasing')
  ws.getColumn(1).width = 34
  ws.getColumn(2).width = 16
  ws.getColumn(3).width = 16
  ws.getColumn(4).width = 14
  ws.getColumn(5).width = 16
  ws.getColumn(6).width = 18
  ws.getColumn(7).width = 40

  ws.getCell('A1').value = `Rekap Kebutuhan Beli — ${project.name}`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A2').value = `Klien: ${project.client_name ?? '-'} · Lokasi: ${project.location ?? '-'}`

  const headerRow = 4
  const headers = ['Material', 'Kategori', 'Kebutuhan', 'Satuan', 'Qty Beli', 'Satuan Beli', 'Harga Satuan', 'Subtotal', 'Keterangan']
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = HEADER_FONT
  })

  let r = headerRow + 1
  for (const row of rows) {
    ws.getCell(r, 1).value = row.materialName
    ws.getCell(r, 2).value = row.category ?? '-'
    ws.getCell(r, 3).value = row.costQty
    ws.getCell(r, 4).value = row.costUnit
    ws.getCell(r, 5).value = row.purchaseQty
    ws.getCell(r, 6).value = row.purchaseUnit
    ws.getCell(r, 7).value = row.unitPrice
    ws.getCell(r, 7).numFmt = CURRENCY_FMT
    ws.getCell(r, 8).value = row.subtotal
    ws.getCell(r, 8).numFmt = CURRENCY_FMT
    ws.getCell(r, 9).value = row.matched ? '' : 'Belum cocok / perlu cek manual'
    r++
  }

  ws.getCell(r, 7).value = 'Total'
  ws.getCell(r, 7).font = HEADER_FONT
  ws.getCell(r, 8).value = { formula: `SUM(H${headerRow + 1}:H${r - 1})` }
  ws.getCell(r, 8).numFmt = CURRENCY_FMT
  ws.getCell(r, 8).font = HEADER_FONT

  return wb
}

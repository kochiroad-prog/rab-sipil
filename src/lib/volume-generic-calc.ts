// Kalkulasi volume dasar untuk generator "Resep Volume Generik" (Fase D).
// Berbeda dari volume-calc.ts (khusus elemen struktur beton kolom/balok/sloof/plat),
// lib ini menghitung SATU angka "volume dasar" dari dimensi generik, yang lalu dikalikan
// koefisien per item resep untuk menghasilkan beberapa rab_items sekaligus.

import type { FormulaType } from '@/types/database'

export type GenericDimensions = {
  formula_type: FormulaType
  quantity: number
  panjang_m: number
  lebar_m: number
  lebar_atas_m: number
  lebar_bawah_m: number
  tinggi_m: number
  custom_volume: number
}

function round(n: number, decimals = 4) {
  const f = 10 ** decimals
  return Math.round((n + Number.EPSILON) * f) / f
}

// Menghitung volume/luas/panjang dasar UNTUK SATU UNIT (belum dikali quantity).
export function calcBaseUnit(d: GenericDimensions): number {
  switch (d.formula_type) {
    case 'pxlxt':
      // volume: panjang x lebar x tinggi (m3)
      return d.panjang_m * d.lebar_m * d.tinggi_m
    case 'pxl':
      // luas: panjang x lebar (m2)
      return d.panjang_m * d.lebar_m
    case 'keliling': {
      // keliling ruangan/atap. Jika tinggi diisi -> luas dinding keliling (m2), jika tidak -> panjang keliling saja (m1)
      const keliling = 2 * (d.panjang_m + d.lebar_m)
      return d.tinggi_m > 0 ? keliling * d.tinggi_m : keliling
    }
    case 'trapesium':
      // penampang trapesium (lebar atas + lebar bawah)/2 x tinggi, x panjang (m3) — pola pondasi menerus
      return ((d.lebar_atas_m + d.lebar_bawah_m) / 2) * d.tinggi_m * d.panjang_m
    case 'custom':
      return d.custom_volume
    default:
      return 0
  }
}

// Total volume dasar = base per unit x quantity (jumlah elemen identik)
export function calcBaseTotal(d: GenericDimensions): number {
  const qty = d.quantity > 0 ? d.quantity : 1
  return round(calcBaseUnit(d) * qty)
}

export const FORMULA_LABEL: Record<FormulaType, string> = {
  pxlxt: 'Panjang x Lebar x Tinggi (m3)',
  pxl: 'Panjang x Lebar (m2)',
  keliling: 'Keliling (m1 atau m2 jika ada tinggi)',
  trapesium: 'Trapesium: (Lebar Atas + Lebar Bawah)/2 x Tinggi x Panjang (m3)',
  custom: 'Input Volume/Qty Manual',
}

// Kalkulasi volume beton, bekisting & kebutuhan besi untuk generator "Backup Volume".
// Formula estimasi standar (bukan pengganti hitungan structural engineer):
// - Berat besi per meter: (pi/4) * d(m)^2 * 7850 kg/m3
// - Sengkang: jumlah = panjang / jarak + 1, panjang per sengkang = keliling penampang + kait 20cm
// - Bekisting balok/sloof: model U (2 sisi tegak + dasar), kolom: 4 sisi penuh, plat: sisi dasar saja

import type { ElementType } from '@/types/database'

export type ElementDimensions = {
  element_type: ElementType
  quantity: number
  length_m: number
  width_m: number
  height_m: number
  thickness_m: number
  main_bar_dia_mm: number
  main_bar_count: number
  main_bar_spacing_m: number
  stirrup_dia_mm: number
  stirrup_spacing_m: number
}

export type ElementResult = {
  volume_beton_m3: number
  volume_bekisting_m2: number
  berat_besi_kg: number
}

const STEEL_DENSITY_KG_M3 = 7850

export function steelWeightPerMeter(diaMm: number): number {
  if (!diaMm || diaMm <= 0) return 0
  const diaM = diaMm / 1000
  return (Math.PI / 4) * diaM * diaM * STEEL_DENSITY_KG_M3
}

function round(n: number, decimals = 4) {
  const f = 10 ** decimals
  return Math.round((n + Number.EPSILON) * f) / f
}

export function calcElement(d: ElementDimensions): ElementResult {
  const qty = d.quantity > 0 ? d.quantity : 1
  const wMain = steelWeightPerMeter(d.main_bar_dia_mm)
  const wStirrup = steelWeightPerMeter(d.stirrup_dia_mm)

  if (d.element_type === 'plat') {
    const volumeBeton = d.length_m * d.width_m * d.thickness_m * qty
    const bekisting = d.length_m * d.width_m * qty

    let besi = 0
    if (d.main_bar_spacing_m > 0) {
      const jumlahX = Math.floor(d.width_m / d.main_bar_spacing_m) + 1
      const jumlahY = Math.floor(d.length_m / d.main_bar_spacing_m) + 1
      besi = (jumlahX * d.length_m + jumlahY * d.width_m) * wMain * qty
    }

    return {
      volume_beton_m3: round(volumeBeton),
      volume_bekisting_m2: round(bekisting),
      berat_besi_kg: round(besi, 2),
    }
  }

  // kolom, balok, sloof: penampang persegi width x height, panjang = length_m
  const volumeBeton = d.width_m * d.height_m * d.length_m * qty
  const keliling = 2 * (d.width_m + d.height_m)

  const bekisting =
    d.element_type === 'kolom'
      ? keliling * d.length_m * qty
      : (2 * d.height_m + d.width_m) * d.length_m * qty // model U untuk balok/sloof

  const besiUtama = d.main_bar_count * d.length_m * wMain * qty

  let besiSengkang = 0
  if (d.stirrup_spacing_m > 0) {
    const jumlahSengkang = Math.floor(d.length_m / d.stirrup_spacing_m) + 1
    const panjangSengkang = keliling + 0.2 // + kait 20cm
    besiSengkang = jumlahSengkang * panjangSengkang * wStirrup * qty
  }

  return {
    volume_beton_m3: round(volumeBeton),
    volume_bekisting_m2: round(bekisting),
    berat_besi_kg: round(besiUtama + besiSengkang, 2),
  }
}

// Konversi total kebutuhan besi (per diameter) ke jumlah batang pembelian 12m + estimasi waste.
export function batangKebutuhan(totalPanjangM: number, panjangBatang = 12, wastePercent = 5) {
  const totalDenganWaste = totalPanjangM * (1 + wastePercent / 100)
  return Math.ceil(totalDenganWaste / panjangBatang)
}

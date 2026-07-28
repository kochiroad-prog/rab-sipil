/**
 * PURCHASING TAKE-OFF — Rule Engine deterministik (BUKAN AI).
 * Agregasi kebutuhan material lintas item RAB (lewat komposisi AHSP bahan),
 * dikonversi ke satuan beli (dibulatkan ke satuan utuh: sak/lembar/batang/dll)
 * memakai metadata Material DB. Kalau komponen tidak terhubung ke Material DB,
 * dicoba fuzzy-match by nama; kalau tetap gagal, ditandai "belum cocok".
 */
import type { AhspComponent, Material, RabItem } from '@/types/database'

export type PurchaseRow = {
  key: string
  materialName: string
  category: string | null
  matched: boolean
  matchedId: string | null
  costQty: number
  costUnit: string
  purchaseQty: number
  purchaseUnit: string
  unitPrice: number
  subtotal: number
  detail: string
}

function normText(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Skor kecocokan nama komponen ke material di katalog (0 = tidak cocok). */
export function scoreMaterialMatch(name: string, unit: string, m: Material): number {
  const n = normText(name)
  const candidates = [m.name, ...(m.aliases ?? [])].map(normText)
  let best = 0
  for (const c of candidates) {
    if (!c) continue
    if (c === n) return 100
    const sub = c.includes(n) || n.includes(c)
    if (!sub) continue
    let s = 5
    if (normText(m.unit) === normText(unit)) s += 3
    best = Math.max(best, s)
  }
  return best
}

export function findBestMaterial(name: string, unit: string, materials: Material[]): Material | null {
  let best: Material | null = null
  let bestScore = 0
  for (const m of materials) {
    const s = scoreMaterialMatch(name, unit, m)
    if (s > bestScore) {
      best = m
      bestScore = s
    }
  }
  return bestScore >= 5 ? best : null
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Hitung baris pembelian per material dari kebutuhan (costQty dalam SATUAN ASLI KOMPONEN AHSP,
 * bukan satuan material). Konversi ke satuan beli mengikuti `kind` material:
 *  - linear: costQty diasumsikan meter -> dibagi panjang batang (length_mm)
 *  - sheet:  costQty diasumsikan m² -> dibagi luas lembar
 *  - coverage: costQty diasumsikan m² -> dibagi daya sebar
 *  - count/bulk: costQty dipakai langsung (butuh satuan komponen == satuan material di Material DB)
 * Kalau kind butuh satuan tertentu tapi satuan komponen beda, harga TIDAK dihitung otomatis
 * (ditandai unitMismatch) supaya tidak salah kalikan harga karena beda satuan.
 */
function toPurchaseRow(
  name: string,
  category: string | null,
  costQty: number,
  componentUnit: string,
  m: Material | null,
  fallbackUnit: string
): PurchaseRow {
  const key = m?.id ?? normText(name)
  if (!m) {
    return {
      key,
      materialName: name,
      category,
      matched: false,
      matchedId: null,
      costQty: round2(costQty),
      costUnit: fallbackUnit,
      purchaseQty: Math.ceil(costQty),
      purchaseUnit: fallbackUnit,
      unitPrice: 0,
      subtotal: 0,
      detail: 'Belum ada di Material DB — harga & satuan beli perlu diisi manual.',
    }
  }

  const waste = 1 + (m.waste_pct || 0) / 100
  const costWasted = costQty * waste
  let purchaseQty: number
  let purchaseUnit: string
  let detail: string
  let unitMismatch = false

  if (m.kind === 'linear' && (m.length_mm || 0) > 0) {
    const barM = (m.length_mm || 0) / 1000
    purchaseQty = barM > 0 ? Math.ceil(costWasted / barM) : Math.ceil(costWasted)
    purchaseUnit = 'batang'
    detail = `${round2(costQty)} ${componentUnit} ≈ ${purchaseQty} batang (@${barM}m)`
  } else if (m.kind === 'sheet' && (m.sheet_width_mm || 0) > 0 && (m.sheet_height_mm || 0) > 0) {
    const sheetArea = ((m.sheet_width_mm || 0) / 1000) * ((m.sheet_height_mm || 0) / 1000)
    purchaseQty = sheetArea > 0 ? Math.ceil(costWasted / sheetArea) : Math.ceil(costWasted)
    purchaseUnit = 'lembar'
    detail = `${round2(costQty)} ${componentUnit} ≈ ${purchaseQty} lembar`
  } else if (m.kind === 'coverage' && (m.coverage_per_unit || 0) > 0) {
    purchaseQty = Math.ceil(costWasted / (m.coverage_per_unit || 1))
    purchaseUnit = m.unit
    detail = `${round2(costQty)} ${componentUnit} ≈ ${purchaseQty} ${m.unit}`
  } else {
    // count / bulk: butuh satuan komponen AHSP == satuan Material DB, kalau tidak, tandai mismatch
    purchaseQty = Math.ceil(costWasted)
    purchaseUnit = m.unit
    unitMismatch = normText(componentUnit) !== normText(m.unit)
    detail = unitMismatch
      ? `⚠ satuan komponen (${componentUnit}) berbeda dari satuan Material DB (${m.unit}) — cek konversi manual sebelum pakai harga ini.`
      : `${round2(costQty)} ${m.unit}`
  }

  return {
    key,
    materialName: m.name,
    category: m.category,
    matched: !unitMismatch,
    matchedId: m.id,
    costQty: round2(costQty),
    costUnit: componentUnit,
    purchaseQty,
    purchaseUnit,
    unitPrice: unitMismatch ? 0 : m.price,
    subtotal: unitMismatch ? 0 : round2(purchaseQty * m.price),
    detail,
  }
}

/**
 * Agregasi kebutuhan bahan lintas rab_items (lewat komposisi AHSP bahan) + materials katalog.
 * componentsByAhspItem: map ahsp_item_id -> daftar ahsp_components (khusus component_type='material').
 */
export function aggregateMaterials(
  rabItems: RabItem[],
  componentsByAhspItem: Map<string, AhspComponent[]>,
  materials: Material[]
): PurchaseRow[] {
  // key material_id (kalau ada) atau nama-ternormalisasi -> total qty basis biaya + unit
  const totals = new Map<string, { name: string; unit: string; material_id: string | null; qty: number }>()

  for (const item of rabItems) {
    if (!item.ahsp_item_id) continue
    const comps = componentsByAhspItem.get(item.ahsp_item_id) ?? []
    for (const c of comps) {
      const key = c.material_id ?? `name:${normText(c.name)}:${normText(c.unit)}`
      const qty = c.coefficient * item.volume
      const existing = totals.get(key)
      if (existing) {
        existing.qty += qty
      } else {
        totals.set(key, { name: c.name, unit: c.unit, material_id: c.material_id, qty })
      }
    }
  }

  const materialsById = new Map(materials.map((m) => [m.id, m]))
  const rows: PurchaseRow[] = []

  for (const { name, unit, material_id, qty } of totals.values()) {
    let material = material_id ? materialsById.get(material_id) ?? null : null
    if (!material) material = findBestMaterial(name, unit, materials)
    rows.push(toPurchaseRow(name, material?.category ?? null, qty, unit, material, unit))
  }

  return rows.sort((a, b) => b.subtotal - a.subtotal)
}

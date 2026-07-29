import DxfParser, { type IDxf, type IEntity, type ILineEntity, type ILwpolylineEntity, type IPolylineEntity } from 'dxf-parser'

// Take-off deterministik dari file DXF — tanpa AI. Setiap dinding/garis di file DXF adalah
// vector dengan koordinat pasti, jadi panjang & luas dihitung matematis langsung dari file
// (bukan tebakan). Dikelompokkan per layer supaya user tinggal mencocokkan tiap layer ke
// item AHSP (mis. layer "DINDING" -> AHSP pasangan bata, layer "LANTAI" -> AHSP keramik).

export type DxfLayerSummary = {
  layer: string
  totalLengthM: number
  totalAreaM2: number
  segmentCount: number
  closedShapeCount: number
}

export type DxfUnitInfo = { factor: number; detected: boolean; unitName: string }

// Kode $INSUNITS standar DXF -> faktor konversi ke meter.
const UNIT_TO_METER: Record<number, number> = {
  1: 0.0254, // inci
  2: 0.3048, // kaki
  4: 0.001, // milimeter
  5: 0.01, // sentimeter
  6: 1, // meter
  10: 0.9144, // yard
}
const UNIT_NAME: Record<number, string> = {
  1: 'inci',
  2: 'kaki',
  4: 'milimeter',
  5: 'sentimeter',
  6: 'meter',
  10: 'yard',
}

export function detectUnitFactor(dxf: IDxf): DxfUnitInfo {
  const raw = dxf.header?.['$INSUNITS']
  const code = typeof raw === 'number' ? raw : null
  if (code && UNIT_TO_METER[code]) {
    return { factor: UNIT_TO_METER[code], detected: true, unitName: UNIT_NAME[code] ?? `kode ${code}` }
  }
  return { factor: 1, detected: false, unitName: 'tidak diketahui' }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function polygonArea(points: { x: number; y: number }[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    sum += p1.x * p2.y - p2.x * p1.y
  }
  return Math.abs(sum) / 2
}

export type DxfTakeoffResult = {
  layers: DxfLayerSummary[]
  unit: DxfUnitInfo
  entityCount: number
}

/** unitFactorOverride: kalau user isi manual (mis. skala tidak terbaca dari file). */
export function computeDxfTakeoff(dxfText: string, unitFactorOverride?: number): DxfTakeoffResult {
  const parser = new DxfParser()
  let dxf: IDxf | null
  try {
    dxf = parser.parseSync(dxfText)
  } catch (e) {
    throw new Error('Gagal membaca file DXF: ' + (e instanceof Error ? e.message : 'format tidak dikenali'))
  }
  if (!dxf) throw new Error('Gagal membaca file DXF (format tidak dikenali atau kosong).')

  const unit = unitFactorOverride ? { factor: unitFactorOverride, detected: true, unitName: 'manual' } : detectUnitFactor(dxf)
  const byLayer = new Map<string, DxfLayerSummary>()

  function ensure(layer: string): DxfLayerSummary {
    let s = byLayer.get(layer)
    if (!s) {
      s = { layer, totalLengthM: 0, totalAreaM2: 0, segmentCount: 0, closedShapeCount: 0 }
      byLayer.set(layer, s)
    }
    return s
  }

  const entities: IEntity[] = dxf.entities ?? []
  let entityCount = 0

  for (const e of entities) {
    const layerName = e.layer || '0'

    if (e.type === 'LINE') {
      const line = e as ILineEntity
      const [a, b] = line.vertices ?? []
      if (a && b) {
        const s = ensure(layerName)
        s.totalLengthM += dist(a, b) * unit.factor
        s.segmentCount++
        entityCount++
      }
    } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      const poly = e as ILwpolylineEntity | IPolylineEntity
      const verts = poly.vertices ?? []
      if (verts.length >= 2) {
        const s = ensure(layerName)
        let len = 0
        for (let i = 0; i < verts.length - 1; i++) len += dist(verts[i], verts[i + 1])
        if (poly.shape) len += dist(verts[verts.length - 1], verts[0])
        s.totalLengthM += len * unit.factor
        s.segmentCount++
        entityCount++
        if (poly.shape && verts.length >= 3) {
          s.totalAreaM2 += polygonArea(verts) * unit.factor * unit.factor
          s.closedShapeCount++
        }
      }
    }
  }

  const layers = Array.from(byLayer.values()).sort((a, b) => a.layer.localeCompare(b.layer))
  return { layers, unit, entityCount }
}

export function isDxfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.dxf')
}

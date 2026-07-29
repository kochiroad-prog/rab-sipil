import DxfParser, {
  type IDxf,
  type IEntity,
  type ILineEntity,
  type ILwpolylineEntity,
  type IPolylineEntity,
  type IInsertEntity,
  type ICircleEntity,
  type IArcEntity,
  type IBlock,
} from 'dxf-parser'

// Take-off deterministik dari file DXF — tanpa AI. Setiap dinding/garis di file DXF adalah
// vector dengan koordinat pasti, jadi panjang & luas dihitung matematis langsung dari file
// (bukan tebakan).
//
// PENTING: banyak file DXF hasil ekspor SketchUp/AutoCAD menyimpan geometri di dalam BLOCK
// (grup) yang dipasang ke modelspace lewat entity INSERT — bukan langsung sebagai entity di
// modelspace. Kalau cuma baca dxf.entities top-level, geometri di dalam block akan terlewat
// sama sekali (bisa >90% dari isi gambar). Karena itu kita expand semua INSERT secara rekursif
// (block bisa berisi INSERT ke block lain) sambil menerapkan transformasi posisi/skala/rotasi-nya,
// dengan penjaga siklus supaya tidak infinite loop kalau ada referensi block yang muter balik.
//
// Dikelompokkan per layer DAN per nama block top-level (grup), karena banyak file (terutama
// dari SketchUp) menaruh semua entity di layer "0" saja — dalam kasus itu, pengelompokan per
// layer jadi tidak berguna (cuma 1 baris), sedangkan nama grup/block masih bisa membedakan
// bagian-bagian gambar (tiap grup biasanya = 1 objek/komponen yang digambar terpisah).

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

type Pt = { x: number; y: number; z: number }

// Transform affine 2D+Z (rotasi hanya di sumbu Z, sesuai perilaku INSERT standar DXF).
type Transform = {
  tx: number
  ty: number
  tz: number
  sx: number
  sy: number
  sz: number
  cos: number
  sin: number
}

const IDENTITY: Transform = { tx: 0, ty: 0, tz: 0, sx: 1, sy: 1, sz: 1, cos: 1, sin: 0 }

function applyTransform(t: Transform, p: Pt): Pt {
  const x = p.x * t.sx
  const y = p.y * t.sy
  const z = p.z * t.sz
  return {
    x: t.tx + x * t.cos - y * t.sin,
    y: t.ty + x * t.sin + y * t.cos,
    z: t.tz + z,
  }
}

// Gabungkan transform "parent" (local->world block pemanggil) dengan transform INSERT baru
// (local block anak -> local parent), menghasilkan transform local anak -> world.
function composeTransform(parent: Transform, insertLocal: Transform): Transform {
  const cos = insertLocal.cos * parent.cos - insertLocal.sin * parent.sin
  const sin = insertLocal.sin * parent.cos + insertLocal.cos * parent.sin
  const base = applyTransform(parent, { x: insertLocal.tx, y: insertLocal.ty, z: insertLocal.tz })
  return {
    tx: base.x,
    ty: base.y,
    tz: base.z,
    sx: insertLocal.sx * parent.sx,
    sy: insertLocal.sy * parent.sy,
    sz: insertLocal.sz * parent.sz,
    cos,
    sin,
  }
}

/** Entity mentah + transform yang harus diterapkan ke titik-titiknya, plus label grup asal. */
type FlatEntity = { entity: IEntity; transform: Transform; groupLabel: string }

const MAX_DEPTH = 25
const MAX_ARRAY_INSTANCES = 500 // guard untuk INSERT array (columnCount x rowCount) yang tidak wajar

function expandEntities(
  dxf: IDxf,
  entities: IEntity[],
  transform: Transform,
  groupLabel: string,
  depth: number,
  visitedBlocks: Set<string>,
  out: FlatEntity[]
) {
  if (depth > MAX_DEPTH) return
  for (const e of entities) {
    if (e.type === 'INSERT') {
      const ins = e as IInsertEntity
      const block: IBlock | undefined = dxf.blocks?.[ins.name]
      if (!block || !block.entities || block.entities.length === 0) continue
      if (visitedBlocks.has(ins.name)) continue // cegah siklus block-mereferensi-diri
      const basePos = block.position ?? { x: 0, y: 0, z: 0 }
      const rotRad = ((ins.rotation ?? 0) * Math.PI) / 180
      const cols = Math.max(1, Math.min(ins.columnCount ?? 1, MAX_ARRAY_INSTANCES))
      const rows = Math.max(1, Math.min(ins.rowCount ?? 1, MAX_ARRAY_INSTANCES))
      const colSpacing = ins.columnSpacing ?? 0
      const rowSpacing = ins.rowSpacing ?? 0

      visitedBlocks.add(ins.name)
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const localInsert: Transform = {
            tx: (ins.position?.x ?? 0) - basePos.x * (ins.xScale ?? 1) + c * colSpacing,
            ty: (ins.position?.y ?? 0) - basePos.y * (ins.yScale ?? 1) + r * rowSpacing,
            tz: (ins.position?.z ?? 0) - basePos.z * (ins.zScale ?? 1),
            sx: ins.xScale ?? 1,
            sy: ins.yScale ?? 1,
            sz: ins.zScale ?? 1,
            cos: Math.cos(rotRad),
            sin: Math.sin(rotRad),
          }
          const combined = composeTransform(transform, localInsert)
          const nextLabel = depth === 0 ? ins.name : groupLabel
          expandEntities(dxf, block.entities, combined, nextLabel, depth + 1, visitedBlocks, out)
        }
      }
      visitedBlocks.delete(ins.name)
    } else {
      out.push({ entity: e, transform, groupLabel })
    }
  }
}

function transformVertices(t: Transform, verts: readonly { x: number; y: number; z?: number }[]): Pt[] {
  return verts.map((v) => applyTransform(t, { x: v.x, y: v.y, z: v.z ?? 0 }))
}

export type DxfTakeoffResult = {
  layers: DxfLayerSummary[]
  groups: DxfLayerSummary[] // pengelompokan alternatif: per nama grup/block top-level (atau "modelspace")
  unit: DxfUnitInfo
  entityCount: number
  blockCount: number
  nestedEntityCount: number
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

  const flat: FlatEntity[] = []
  expandEntities(dxf, dxf.entities ?? [], IDENTITY, 'modelspace', 0, new Set(), flat)

  const byLayer = new Map<string, DxfLayerSummary>()
  const byGroup = new Map<string, DxfLayerSummary>()

  function ensure(map: Map<string, DxfLayerSummary>, key: string): DxfLayerSummary {
    let s = map.get(key)
    if (!s) {
      s = { layer: key, totalLengthM: 0, totalAreaM2: 0, segmentCount: 0, closedShapeCount: 0 }
      map.set(key, s)
    }
    return s
  }

  let entityCount = 0
  const blockCount = Object.keys(dxf.blocks ?? {}).length
  const nestedEntityCount = flat.length - (dxf.entities?.length ?? 0)

  for (const { entity: e, transform, groupLabel } of flat) {
    const layerName = e.layer || '0'
    const sLayer = ensure(byLayer, layerName)
    const sGroup = ensure(byGroup, groupLabel)

    if (e.type === 'LINE') {
      const line = e as ILineEntity
      const [a0, b0] = line.vertices ?? []
      if (a0 && b0) {
        const [a, b] = transformVertices(transform, [a0, b0])
        const len = dist(a, b) * unit.factor
        sLayer.totalLengthM += len
        sLayer.segmentCount++
        sGroup.totalLengthM += len
        sGroup.segmentCount++
        entityCount++
      }
    } else if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
      const poly = e as ILwpolylineEntity | IPolylineEntity
      const rawVerts = poly.vertices ?? []
      if (rawVerts.length >= 2) {
        const verts = transformVertices(transform, rawVerts)
        let len = 0
        for (let i = 0; i < verts.length - 1; i++) len += dist(verts[i], verts[i + 1])
        if (poly.shape) len += dist(verts[verts.length - 1], verts[0])
        len *= unit.factor
        sLayer.totalLengthM += len
        sLayer.segmentCount++
        sGroup.totalLengthM += len
        sGroup.segmentCount++
        entityCount++
        if (poly.shape && verts.length >= 3) {
          const area = polygonArea(verts) * unit.factor * unit.factor
          sLayer.totalAreaM2 += area
          sLayer.closedShapeCount++
          sGroup.totalAreaM2 += area
          sGroup.closedShapeCount++
        }
      }
    } else if (e.type === 'CIRCLE') {
      const c = e as ICircleEntity
      // Radius ikut skala transform (pakai rata-rata sx/sy kalau non-uniform).
      const scale = (Math.abs(transform.sx) + Math.abs(transform.sy)) / 2
      const r = (c.radius ?? 0) * scale * unit.factor
      if (r > 0) {
        const circumference = 2 * Math.PI * r
        const area = Math.PI * r * r
        sLayer.totalLengthM += circumference
        sLayer.totalAreaM2 += area
        sLayer.segmentCount++
        sLayer.closedShapeCount++
        sGroup.totalLengthM += circumference
        sGroup.totalAreaM2 += area
        sGroup.segmentCount++
        sGroup.closedShapeCount++
        entityCount++
      }
    } else if (e.type === 'ARC') {
      const a = e as IArcEntity
      const scale = (Math.abs(transform.sx) + Math.abs(transform.sy)) / 2
      const r = (a.radius ?? 0) * scale * unit.factor
      const angleLen = a.angleLength ?? 0
      if (r > 0 && angleLen > 0) {
        const len = r * angleLen
        sLayer.totalLengthM += len
        sLayer.segmentCount++
        sGroup.totalLengthM += len
        sGroup.segmentCount++
        entityCount++
      }
    }
  }

  const layers = Array.from(byLayer.values()).sort((a, b) => a.layer.localeCompare(b.layer))
  const groups = Array.from(byGroup.values()).sort((a, b) => a.layer.localeCompare(b.layer))
  return { layers, groups, unit, entityCount, blockCount, nestedEntityCount }
}

export function isDxfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.dxf')
}

import { parseSkp, type SkpModel } from 'openskp'

// Take-off deterministik dari file SketchUp (.skp) — mirip dxf-takeoff.ts, tapi untuk model
// 3D SketchUp. Beda dengan DXF, file .skp hampir selalu punya nama grup/komponen generik
// ("Group#18", dst — SketchUp otomatis menomori grup yang tidak diberi nama user), sehingga
// pengelompokan yang jauh lebih berguna di sini adalah per NAMA MATERIAL yang dipasang di tiap
// permukaan (mis. "Roofing Shingles Asphalt", "Wood Floor", "White Subway Tile") — itu langsung
// mencerminkan jenis pekerjaan (atap, lantai, keramik, dst), bukan cuma nomor grup.
//
// CATATAN TEKNIS: `openskp` adalah package pihak ketiga yang sangat baru (reverse-engineered,
// belum ada parser resmi untuk .skp). API publiknya (parseSkp/toJSON) sengaja TIDAK menyertakan
// materialId per-face maupun matrix transformasi penuh (rotasi) di tiap instance — cuma posisi
// (translasi) & nama. Satu-satunya tempat geometri sudah ditransformasi penuh ke world-space
// (skala meter, rotasi diterapkan) DAN masih membawa info material per grup adalah properti
// internal `_glbPrimitives`/`_gltfMaterials` yang dipakai `toGLB()` — jadi kita pakai itu lewat
// type-cast dengan fallback aman kalau strukturnya berubah di versi mendatang.

type GlbPrimitive = {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  materialIndex: number
  geomName: string
}
type GltfMaterialInternal = {
  pbrMetallicRoughness?: { baseColorFactor?: number[] }
}
type SkpModelInternal = SkpModel & {
  _glbPrimitives?: GlbPrimitive[]
  _gltfMaterials?: GltfMaterialInternal[]
}

export type SkpMaterialSummary = {
  material: string
  totalAreaM2: number
  faceCount: number
}

export type SkpTakeoffResult = {
  byMaterial: SkpMaterialSummary[]
  byGroup: SkpMaterialSummary[]
  definitionCount: number
  meshCount: number
  materialCount: number
  sketchupVersion: string
}

function triArea(px: Float32Array, i0: number, i1: number, i2: number): number {
  const ax = px[i0 * 3], ay = px[i0 * 3 + 1], az = px[i0 * 3 + 2]
  const bx = px[i1 * 3], by = px[i1 * 3 + 1], bz = px[i1 * 3 + 2]
  const cx = px[i2 * 3], cy = px[i2 * 3 + 1], cz = px[i2 * 3 + 2]
  const ux = bx - ax, uy = by - ay, uz = bz - az
  const vx = cx - ax, vy = cy - ay, vz = cz - az
  const crossX = uy * vz - uz * vy
  const crossY = uz * vx - ux * vz
  const crossZ = ux * vy - uy * vx
  return 0.5 * Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ)
}

function colorKey(r: number, g: number, b: number): string {
  return `${Math.round(r)},${Math.round(g)},${Math.round(b)}`
}

export function computeSkpTakeoff(buffer: ArrayBuffer): SkpTakeoffResult {
  let model: SkpModelInternal
  try {
    model = parseSkp(buffer) as SkpModelInternal
  } catch (e) {
    throw new Error('Gagal membaca file SketchUp: ' + (e instanceof Error ? e.message : 'format tidak dikenali'))
  }
  if (!model) throw new Error('Gagal membaca file SketchUp (format tidak dikenali atau kosong).')

  const prims = model._glbPrimitives ?? []
  const gltfMaterials = model._gltfMaterials ?? []
  if (prims.length === 0) {
    throw new Error(
      'Tidak ada permukaan (face) yang terbaca dari file ini — mungkin model kosong, atau strukturnya belum didukung parser.'
    )
  }

  // Peta warna -> nama material asli (dari daftar material publik) supaya nama semantik
  // (mis. "Roofing Shingles Asphalt") tidak hilang meski internal glTF cuma nyimpen warna.
  const colorToName = new Map<string, string>()
  for (const m of model.materials ?? []) {
    colorToName.set(colorKey(m.color.r, m.color.g, m.color.b), m.name)
  }

  const byMaterial = new Map<string, SkpMaterialSummary>()
  const byGroup = new Map<string, SkpMaterialSummary>()

  function ensure(map: Map<string, SkpMaterialSummary>, key: string): SkpMaterialSummary {
    let s = map.get(key)
    if (!s) {
      s = { material: key, totalAreaM2: 0, faceCount: 0 }
      map.set(key, s)
    }
    return s
  }

  for (const prim of prims) {
    const gltfMat = gltfMaterials[prim.materialIndex]
    const bc = gltfMat?.pbrMetallicRoughness?.baseColorFactor
    let materialName = 'Tanpa nama material'
    if (bc && bc.length >= 3) {
      const key = colorKey(bc[0] * 255, bc[1] * 255, bc[2] * 255)
      materialName = colorToName.get(key) ?? materialName
    }
    const groupName = model.meshIndex?.[prim.geomName]?.definitionName || 'modelspace'

    let area = 0
    let faces = 0
    for (let i = 0; i + 2 < prim.indices.length; i += 3) {
      area += triArea(prim.positions, prim.indices[i], prim.indices[i + 1], prim.indices[i + 2])
      faces++
    }

    const sm = ensure(byMaterial, materialName)
    sm.totalAreaM2 += area
    sm.faceCount += faces

    const sg = ensure(byGroup, groupName)
    sg.totalAreaM2 += area
    sg.faceCount += faces
  }

  return {
    byMaterial: Array.from(byMaterial.values()).sort((a, b) => b.totalAreaM2 - a.totalAreaM2),
    byGroup: Array.from(byGroup.values()).sort((a, b) => b.totalAreaM2 - a.totalAreaM2),
    definitionCount: model.definitions?.size ?? 0,
    meshCount: prims.length,
    materialCount: model.materials?.length ?? 0,
    sketchupVersion: model.version ?? 'tidak diketahui',
  }
}

export function isSkpFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.skp')
}

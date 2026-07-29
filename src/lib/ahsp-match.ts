// Pencocokan deterministik nama pekerjaan (hasil deteksi AI / input bebas) ke referensi AHSP.
// BUKAN AI — skor kemiripan token berbobot TF-IDF (kata langka seperti "pengecatan"/"aanstamping"
// dibobot lebih tinggi daripada kata umum seperti "pasangan"/"dinding" yang muncul di ratusan item),
// konsisten dengan filosofi "Rule Engine deterministik, AI hanya identifikasi" di project ini.

export type AhspMatchCandidate = {
  id: string
  code: string | null
  name: string
  unit: string
  unit_price: number
  tkdn_percent: number
  category_name: string | null
}

export type AhspMatch = AhspMatchCandidate & { score: number }

const STOPWORDS = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'per', 'dengan', 'atau'])

// Kamus sinonim istilah teknis sipil/konstruksi Indonesia — variasi kata di kolom kiri dinormalisasi
// ke bentuk baku di kolom kanan sebelum dicocokkan, supaya "Pengecatan Tembok" bisa nyambung ke
// "Cat Dinding" walau kata mentahnya berbeda. Murni lookup table deterministik, bukan AI.
export const SIPIL_SYNONYMS: Record<string, string> = {
  tembok: 'dinding',
  cor: 'beton',
  mengecor: 'beton',
  pengecoran: 'beton',
  pengecatan: 'cat',
  pengecetan: 'cat',
  mengecat: 'cat',
  plesteran: 'plester',
  memplester: 'plester',
  acian: 'aci',
  pengacian: 'aci',
  mengaci: 'aci',
  penggalian: 'gali',
  galian: 'gali',
  menggali: 'gali',
  urugan: 'urug',
  timbunan: 'urug',
  pengurugan: 'urug',
  mengurug: 'urug',
  pembesian: 'besi',
  penulangan: 'besi',
  tulangan: 'besi',
  bekisting: 'cetakan',
  perancah: 'cetakan',
  pemasangan: 'pasang',
  pasangan: 'pasang',
  memasang: 'pasang',
  fondasi: 'pondasi',
  plafond: 'plafon',
  langit2: 'plafon',
  tegel: 'keramik',
  ubin: 'keramik',
  perpipaan: 'pipa',
  kelistrikan: 'listrik',
  elektrikal: 'listrik',
  pembongkaran: 'bongkar',
  membongkar: 'bongkar',
  pembersihan: 'bersih',
  membersihkan: 'bersih',
  pengangkutan: 'angkut',
  transportasi: 'angkut',
  drainase: 'saluran',
  got: 'saluran',
  waterproofing: 'waterproof',
  pengukuran: 'ukur',
  bowplank: 'uitzet',
  uitzet: 'uitzet',
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => SIPIL_SYNONYMS[t] ?? t)
}

/** Index IDF (inverse document frequency) dibangun sekali dari seluruh kandidat, dipakai lintas beberapa pencarian. */
export type AhspMatchIndex = {
  idf: Map<string, number>
  tokensById: Map<string, string[]>
}

export function buildAhspMatchIndex(candidates: AhspMatchCandidate[]): AhspMatchIndex {
  const df = new Map<string, number>()
  const tokensById = new Map<string, string[]>()
  for (const c of candidates) {
    const tokens = normalizeTokens(c.name)
    tokensById.set(c.id, tokens)
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  }
  const n = candidates.length
  const idf = new Map<string, number>()
  for (const [t, f] of df) idf.set(t, Math.log((n + 1) / (f + 1)) + 1)
  return { idf, tokensById }
}

function scorePair(queryTokens: string[], candTokens: string[], queryRaw: string, candidateRaw: string, idf: Map<string, number>): number {
  if (queryTokens.length === 0 || candTokens.length === 0) return 0
  const candSet = new Set(candTokens)
  let overlapWeight = 0
  let totalWeight = 0
  for (const t of queryTokens) {
    const w = idf.get(t) ?? 1
    totalWeight += w
    if (candSet.has(t)) overlapWeight += w
  }
  let score = totalWeight > 0 ? overlapWeight / totalWeight : 0

  const qLower = queryRaw.toLowerCase().trim()
  const cLower = candidateRaw.toLowerCase().trim()
  if (qLower && cLower && (cLower.includes(qLower) || qLower.includes(cLower))) {
    score = Math.min(1, score + 0.25)
  }
  return score
}

/** Cari kandidat AHSP terbaik untuk satu nama pekerjaan. Return null kalau skor di bawah threshold. */
export function findBestAhspMatch(
  query: string,
  candidates: AhspMatchCandidate[],
  index?: AhspMatchIndex,
  threshold = 0.4
): AhspMatch | null {
  const idx = index ?? buildAhspMatchIndex(candidates)
  const queryTokens = normalizeTokens(query)
  let best: AhspMatch | null = null
  for (const c of candidates) {
    const candTokens = idx.tokensById.get(c.id) ?? normalizeTokens(c.name)
    const score = scorePair(queryTokens, candTokens, query, c.name, idx.idf)
    if (!best || score > best.score) best = { ...c, score }
  }
  if (!best || best.score < threshold) return null
  return best
}

/** Cari beberapa kandidat teratas (untuk UI pilih manual kalau top match kurang yakin). */
export function findTopAhspMatches(
  query: string,
  candidates: AhspMatchCandidate[],
  index?: AhspMatchIndex,
  topN = 5
): AhspMatch[] {
  const idx = index ?? buildAhspMatchIndex(candidates)
  const queryTokens = normalizeTokens(query)
  const scored = candidates.map((c) => ({
    ...c,
    score: scorePair(queryTokens, idx.tokensById.get(c.id) ?? normalizeTokens(c.name), query, c.name, idx.idf),
  }))
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

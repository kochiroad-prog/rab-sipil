/**
 * Supabase/PostgREST caps any unbounded .select() at a default max-rows limit
 * (commonly 1000), silently truncating results with no error. Tables that keep
 * growing (mis. ahsp_items, sekarang 1948 baris) akan diam-diam kepotong kalau
 * di-query tanpa .range() — item yang urutannya (mis. by name) jatuh di atas
 * baris ke-1000 hilang dari hasil, padahal datanya ada di database.
 *
 * Helper ini fetch SEMUA baris dengan loop .range(), berapa pun jumlah barisnya.
 * Pakai untuk query yang memang butuh seluruh tabel (client-side search,
 * combobox, AI matching pool) — bukan untuk lookup satu baris/terfilter kecil.
 */
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await queryPage(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

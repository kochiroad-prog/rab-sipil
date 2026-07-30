// Util murni (tanpa 'use client') supaya bisa dipanggil langsung dari Server Component.
// Sebelumnya isImageUrl() ada di upload-client.ts yang bertanda 'use client' — memanggil fungsi
// biasa dari modul 'use client' langsung di Server Component (bukan me-render sebagai JSX) bikin
// Next.js melempar "Attempted to call isImageUrl() from the server but isImageUrl is on the
// client" (RSC boundary error), yang bikin halaman /estimator & /estimator/[id] gagal total.
export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url.split('?')[0])
}

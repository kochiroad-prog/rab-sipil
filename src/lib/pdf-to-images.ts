// Render tiap halaman PDF jadi gambar PNG di browser (client-side) — dipakai AI Estimator
// supaya user bisa upload PDF gambar kerja, bukan cuma foto. Tidak butuh proses server
// (aman untuk Vercel serverless, tidak perlu binary native seperti poppler/imagemagick).
export async function pdfToImageBlobs(file: File, maxPages = 5): Promise<Blob[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const blobs: Blob[] = []
  const pageCount = Math.min(pdf.numPages, maxPages)

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) blobs.push(blob)
  }

  return blobs
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

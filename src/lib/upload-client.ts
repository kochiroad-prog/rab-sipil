'use client'

import { createClient } from '@/lib/supabase/client'

export type UploadBucket =
  | 'project-photos'
  | 'material-images'
  | 'equipment-images'
  | 'labour-photos'
  | 'payment-proofs'
  | 'signatures'
  | 'invoices'

/** Upload 1 file/blob ke Supabase Storage, kembalikan public URL. Dipakai PhotoUploadInput & SignaturePad. */
export async function uploadToBucket(bucket: UploadBucket, file: File | Blob, extHint = 'jpg'): Promise<string> {
  const supabase = createClient()
  const ext = file instanceof File ? file.name.split('.').pop() || extHint : extHint
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// isImageUrl dipindah ke '@/lib/url-utils' (tanpa 'use client') supaya bisa dipanggil langsung
// dari Server Component (mis. halaman /estimator riwayat) tanpa kena error RSC boundary.

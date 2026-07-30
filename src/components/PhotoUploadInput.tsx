'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2, FileText, Check } from 'lucide-react'
import { uploadToBucket, type UploadBucket } from '@/lib/upload-client'
import { isImageUrl } from '@/lib/url-utils'

/**
 * Input upload foto/dokumen reusable — upload ke Supabase Storage lalu simpan public URL
 * di hidden input (untuk dikirim lewat server action / form biasa).
 * Menggantikan pola lama "base64 langsung ke kolom DB" (SignaturePad/PaymentForm/TerminPayForm).
 */
export default function PhotoUploadInput({
  name,
  bucket,
  label,
  defaultUrl,
  accept = 'image/*',
  multiple = false,
  className = '',
}: {
  name: string
  bucket: UploadBucket
  label?: string
  defaultUrl?: string | null
  accept?: string
  multiple?: boolean
  className?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>(defaultUrl ? [defaultUrl] : [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const done = !multiple && urls.length > 0

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        try {
          newUrls.push(await uploadToBucket(bucket, file))
        } catch (e) {
          setError('Upload gagal: ' + (e instanceof Error ? e.message : 'tidak diketahui'))
        }
      }
      setUrls((prev) => (multiple ? [...prev, ...newUrls] : newUrls.slice(0, 1)))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function reset() {
    setUrls([])
    setError('')
  }

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-600">{label}</label>}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || done}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
            done ? 'bg-emerald-600/60 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
          } disabled:opacity-70`}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : done ? (
            <Check className="size-3.5" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? 'Mengupload...' : done ? 'Terupload' : multiple ? 'Tambah File' : 'Upload File'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
        />
        {done && (
          <button type="button" onClick={reset} className="text-xs text-slate-500 hover:underline">
            Ganti file
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u) => (
            <div
              key={u}
              className="group relative h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
            >
              {isImageUrl(u) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u} alt="terupload" className="h-full w-full object-cover" />
              ) : (
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500"
                >
                  <FileText className="size-5" />
                  <span className="text-[10px]">Lihat</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
                className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {multiple
        ? urls.map((u) => <input key={u} type="hidden" name={name} value={u} />)
        : <input type="hidden" name={name} value={urls[0] ?? ''} />}
    </div>
  )
}

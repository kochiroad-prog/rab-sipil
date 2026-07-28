import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { askOpenRouter } from '@/lib/openrouter'

// Endpoint bantu AI: user kirim deskripsi pekerjaan bebas,
// AI balas draft rincian item RAB (nama, satuan, estimasi volume).
// Hanya bisa diakses user yang sudah login.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { description } = await req.json()
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description wajib diisi' }, { status: 400 })
  }

  try {
    const content = await askOpenRouter([
      {
        role: 'system',
        content:
          'Kamu adalah estimator konstruksi berpengalaman di Indonesia. ' +
          'Berdasarkan deskripsi pekerjaan dari user, buatkan draft rincian item RAB ' +
          'dalam format JSON array, setiap item punya field: name, unit, volume_estimate, note. ' +
          'Jangan sertakan harga satuan (harga akan diisi manual dari database AHSP). ' +
          'Balas HANYA JSON array, tanpa teks lain.',
      },
      { role: 'user', content: description },
    ])

    return NextResponse.json({ result: content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

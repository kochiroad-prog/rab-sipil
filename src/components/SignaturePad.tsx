'use client'

import { useRef, useState, useEffect } from 'react'

export default function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  function pos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: t.clientX - rect.left, y: t.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    const { x, y } = pos(e)
    ctx?.beginPath()
    ctx?.moveTo(x, y)
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const { x, y } = pos(e)
    ctx?.lineTo(x, y)
    ctx?.stroke()
    setEmpty(false)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas) setDataUrl(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setEmpty(true)
    setDataUrl('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={340}
        height={140}
        className="touch-none rounded-md border border-slate-300 bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="mt-1 flex items-center justify-between">
        <button type="button" onClick={clear} className="text-xs text-slate-500 hover:underline">
          Hapus tanda tangan
        </button>
        <span className="text-xs text-slate-400">{empty ? 'Belum ada tanda tangan' : 'Tersimpan'}</span>
      </div>
      <input type="hidden" name={name} value={dataUrl} />
    </div>
  )
}

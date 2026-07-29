'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type AhspOption = {
  id: string
  code: string | null
  name: string
  unit: string
  unit_price: number
  tkdn_percent: number
  category_name: string | null
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const MAX_RESULTS = 50

export default function AhspCombobox({
  items,
  name = 'ahsp_item_id',
  placeholder = 'Cari kode atau nama pekerjaan AHSP...',
  onSelect,
  className,
  defaultSelected = null,
}: {
  items: AhspOption[]
  name?: string
  placeholder?: string
  onSelect?: (item: AhspOption | null) => void
  className?: string
  defaultSelected?: AhspOption | null
}) {
  const [query, setQuery] = useState(defaultSelected?.name ?? '')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AhspOption | null>(defaultSelected)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items.slice(0, MAX_RESULTS)
    const tokens = q.split(/\s+/)
    const filtered = items.filter((it) => {
      const haystack = `${it.code ?? ''} ${it.name} ${it.category_name ?? ''}`.toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })
    return filtered.slice(0, MAX_RESULTS)
  }, [items, query])

  function handleSelect(item: AhspOption) {
    setSelected(item)
    setQuery(item.name)
    setOpen(false)
    onSelect?.(item)
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    onSelect?.(null)
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      <div className="flex items-center gap-1">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (selected) {
              setSelected(null)
              onSelect?.(null)
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            title="Hapus referensi"
            className="shrink-0 rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full min-w-[320px] overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => handleSelect(it)}
              className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
            >
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {it.code && <span>{it.code}</span>}
                {it.category_name && <span className="rounded bg-slate-100 px-1.5 py-0.5">{it.category_name}</span>}
              </div>
              <div className="text-slate-900">{it.name}</div>
              <div className="text-xs text-slate-500">
                {it.unit} · {formatRupiah(it.unit_price)}
                {it.tkdn_percent > 0 && <span className="ml-1 text-emerald-600">TKDN {it.tkdn_percent}%</span>}
              </div>
            </button>
          ))}
          {results.length === MAX_RESULTS && (
            <div className="px-3 py-1.5 text-center text-xs text-slate-400">
              Menampilkan {MAX_RESULTS} hasil teratas — perhalus pencarian untuk hasil lebih spesifik.
            </div>
          )}
        </div>
      )}
      {open && query && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full min-w-[320px] rounded-md border border-slate-200 bg-white p-3 text-center text-sm text-slate-400 shadow-lg">
          Tidak ditemukan.
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'

import { formatCurrency } from '@/lib/utils'

type MarketQuote = {
  source: string
  label: string
  price: number
  url: string | null
  updatedAt: string
  stale: boolean
}

type MarketSummary = {
  lowestPrice: number | null
  highestPrice: number | null
  averagePrice: number | null
}

type MarketHistoryPoint = {
  source: string
  price: number
  captured_at: string
}

type MarketPayload = {
  quotes: MarketQuote[]
  summary: MarketSummary
  history: MarketHistoryPoint[]
}

function formatRelativeDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function MarketInsights({
  cardId,
  variantId,
}: {
  cardId: string
  variantId?: string | null
}) {
  const [data, setData] = useState<MarketPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (variantId) params.set('variant_id', variantId)

        const res = await fetch(`/api/cards/${cardId}/market${params.size ? `?${params}` : ''}`)
        const payload = await res.json()

        if (!cancelled && res.ok) {
          setData(payload)
        }
      } catch (error) {
        console.error('Market insights error:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [cardId, variantId])

  const recentHistory = useMemo(() => {
    return (data?.history ?? []).slice(0, 10).reverse()
  }, [data?.history])

  const maxPrice = useMemo(() => {
    return recentHistory.reduce((max, point) => Math.max(max, point.price), 0)
  }, [recentHistory])

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Loading market pricing...</p>
      </section>
    )
  }

  if (!data || data.quotes.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Market Snapshot</h2>
        <p className="mt-3 text-sm text-slate-600">No live market quotes are available for this card yet.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Market Snapshot</h2>
          <p className="mt-2 text-sm text-slate-600">
            Live pricing when available, with last-known fallback when a source is stale.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-slate-500">Low</p>
            <p className="mt-1 font-bold text-slate-950">
              {data.summary.lowestPrice ? formatCurrency(data.summary.lowestPrice) : '--'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-slate-500">Average</p>
            <p className="mt-1 font-bold text-slate-950">
              {data.summary.averagePrice ? formatCurrency(data.summary.averagePrice) : '--'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-slate-500">High</p>
            <p className="mt-1 font-bold text-slate-950">
              {data.summary.highestPrice ? formatCurrency(data.summary.highestPrice) : '--'}
            </p>
          </div>
        </div>
      </div>

      {recentHistory.length > 0 && (
        <div className="mt-6">
          <div className="flex items-end gap-2 rounded-xl bg-slate-50 p-4">
            {recentHistory.map((point) => (
              <div key={`${point.source}-${point.captured_at}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-md bg-blue-600/80"
                  style={{
                    height: `${Math.max(18, Math.round((point.price / maxPrice) * 96))}px`,
                  }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {point.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {data.quotes.map((quote) => (
          <div key={quote.source} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">{quote.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {quote.stale ? 'Last known price' : 'Live price'} updated {formatRelativeDate(quote.updatedAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-950">{formatCurrency(quote.price)}</p>
                {quote.stale && (
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800">
                    Fallback
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

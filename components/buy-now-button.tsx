'use client'
import { useState } from 'react'

export default function BuyNowButton({
  listingId,
  maxQuantity = 1,
  compact = false,
}: {
  listingId: string
  maxQuantity?: number
  compact?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [quantity, setQuantity] = useState(1)

  async function handleBuy() {
    setLoading(true)
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, quantity }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { alert(data.error || 'Unable to start checkout'); setLoading(false) }
  }

  return (
    <div className={`flex ${compact ? 'flex-row items-center justify-end gap-2' : 'flex-col gap-3'}`}>
      {maxQuantity > 1 && (
        <select
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
          className={`${compact ? 'w-20' : 'w-full'} rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700`}
        >
          {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>
              Qty {value}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={handleBuy}
        disabled={loading}
        className={`${compact ? 'px-4 py-2 text-sm' : 'w-full py-4 text-lg'} rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-bold text-white transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {loading ? 'Redirecting...' : 'Buy Now'}
      </button>
    </div>
  )
}

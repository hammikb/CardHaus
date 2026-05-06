'use client'
import { useState } from 'react'

export default function BuyNowButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleBuy() {
    setLoading(true)
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { alert(data.error); setLoading(false) }
  }

  return (
    <button onClick={handleBuy} disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50">
      {loading ? 'Redirecting...' : 'Buy Now'}
    </button>
  )
}

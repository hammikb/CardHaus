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
    else { alert(data.error || 'Unable to start checkout'); setLoading(false) }
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Redirecting to Stripe...' : 'Buy Now'}
    </button>
  )
}

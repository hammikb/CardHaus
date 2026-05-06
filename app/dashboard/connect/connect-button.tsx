'use client'
import { useState } from 'react'

export default function ConnectButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const res = await fetch('/api/connect/onboard', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { alert(data.error); setLoading(false) }
  }

  return (
    <button onClick={handleConnect} disabled={loading}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
      {loading ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
    </button>
  )
}

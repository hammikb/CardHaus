'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DisputeActions({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle(resolution: 'refund' | 'release') {
    setLoading(true)
    await fetch(`/api/admin/disputes/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2 mt-3">
      <button onClick={() => handle('refund')} disabled={loading}
        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50">
        Refund Buyer
      </button>
      <button onClick={() => handle('release')} disabled={loading}
        className="border px-3 py-1.5 rounded text-sm hover:bg-gray-50 disabled:opacity-50">
        Release to Seller
      </button>
    </div>
  )
}

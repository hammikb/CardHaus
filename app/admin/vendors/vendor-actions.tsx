'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorActions({ sellerId }: { sellerId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle(action: 'approve' | 'reject') {
    setLoading(true)
    await fetch(`/api/admin/vendors/${sellerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handle('approve')} disabled={loading}
        className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
        Approve
      </button>
      <button onClick={() => handle('reject')} disabled={loading}
        className="border border-red-300 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50 disabled:opacity-50">
        Reject
      </button>
    </div>
  )
}

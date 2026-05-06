'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'

function ReviewForm() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const router = useRouter()
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId) { setError('Missing order ID'); return }
    setLoading(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, rating, body }),
    })
    const data = await res.json()
    if (res.ok) router.push('/dashboard/orders')
    else { setError(data.error); setLoading(false) }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Leave a Review</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Comment (optional)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            rows={4} className="w-full border rounded px-3 py-2" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </main>
  )
}

export default function ReviewPage() {
  return <Suspense><ReviewForm /></Suspense>
}

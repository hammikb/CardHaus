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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-950 mb-2">Leave a Review</h1>
          <p className="text-slate-600">Share your experience with this seller</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-4">Rating</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`text-4xl transition-all duration-200 hover:scale-110 ${n <= rating ? 'text-yellow-400' : 'text-slate-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2.5">Comment (optional)</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
                placeholder="Share your experience..."
              />
            </div>
            {error && (
              <p className="text-red-700 text-sm font-medium bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-base transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
      </form>
    </main>
  )
}

export default function ReviewPage() {
  return <Suspense><ReviewForm /></Suspense>
}

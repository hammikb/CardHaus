'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']
const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC']

export default function NewListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    card_type: 'pokemon', condition: 'near_mint',
    grade: '', grade_company: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: Number(form.price), images: [] }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/listings/${data.id}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">List a Card</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Charizard Base Set PSA 10"
            className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={4} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price (USD) *</label>
            <input type="number" step="0.01" min="0.01" value={form.price}
              onChange={e => set('price', e.target.value)}
              className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Card Type *</label>
            <select value={form.card_type} onChange={e => set('card_type', e.target.value)}
              className="w-full border rounded px-3 py-2">
              {CARD_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Condition *</label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)}
              className="w-full border rounded px-3 py-2">
              {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          {form.condition === 'graded' && (
            <div>
              <label className="block text-sm font-medium mb-1">Grade Company</label>
              <select value={form.grade_company} onChange={e => set('grade_company', e.target.value)}
                className="w-full border rounded px-3 py-2">
                <option value="">Select...</option>
                {GRADE_COMPANIES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
        </div>
        {form.condition === 'graded' && (
          <div>
            <label className="block text-sm font-medium mb-1">Grade (e.g. 10, 9.5)</label>
            <input value={form.grade} onChange={e => set('grade', e.target.value)}
              placeholder="10" className="w-full border rounded px-3 py-2" />
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating listing...' : 'List Card'}
        </button>
      </form>
    </main>
  )
}

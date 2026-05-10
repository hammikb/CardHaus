'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CardAutocomplete from '@/components/card-autocomplete'
import PhotoUpload from '@/components/photo-upload'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']
const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC']

interface Card {
  id: string
  card_id: string
  external_id: string
  name: string
  set: string
  image_url: string | null
  price: number | null
  rarity: string | null
}

export default function NewSingleListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    card_type: 'pokemon', condition: 'near_mint',
    grade: '', grade_company: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleCardSelect(card: Card | null, name: string) {
    setSelectedCard(card)
    if (card) {
      set('title', card.name)
      if (card.price) set('price', card.price.toString())
    } else {
      set('title', name)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (images.length === 0) {
      setError('At least one photo is required')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        images,
        product_type: 'single',
        card_variant_id: selectedCard?.id ?? null,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/listings/${data.id}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <Link href="/listings/new" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
          ← Back to product type
        </Link>
        <h1 className="text-3xl font-black text-slate-900 mb-2">List a Single Card</h1>
        <p className="text-slate-600">Fill out the details below to get your card listed</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border border-slate-200 p-8">
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Search Card Database</label>
          <CardAutocomplete
            value={form.title}
            onChange={handleCardSelect}
            placeholder="Start typing card name (e.g. Charizard)..."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Title *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Charizard Base Set 1st Edition"
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe the card's condition, any flaws, special notes..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
        <PhotoUpload value={images} onChange={setImages} />
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Price (USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Card Type *</label>
            <select
              value={form.card_type}
              onChange={e => set('card_type', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {CARD_TYPES.map(t => (
                <option key={t} value={t}>
                  {t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Condition *</label>
            <select
              value={form.condition}
              onChange={e => set('condition', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {CONDITIONS.map(c => (
                <option key={c} value={c}>
                  {c.replace('_', ' ').charAt(0).toUpperCase() + c.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          {form.condition === 'graded' && (
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Grade Company</label>
              <select
                value={form.grade_company}
                onChange={e => set('grade_company', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select...</option>
                {GRADE_COMPANIES.map(g => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {form.condition === 'graded' && (
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Grade (e.g. 10, 9.5)</label>
            <input
              value={form.grade}
              onChange={e => set('grade', e.target.value)}
              placeholder="10"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        )}
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
        >
          {loading ? 'Creating listing...' : 'List Card'}
        </button>
      </form>
    </main>
  )
}

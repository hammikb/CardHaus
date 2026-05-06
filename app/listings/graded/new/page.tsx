'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CardAutocomplete from '@/components/card-autocomplete'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']
const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC']

interface Card {
  id: string
  tcg_player_id: string
  name: string
  set: string
  image_url: string | null
  price: number | null
  rarity: string | null
  condition: string
}

export default function NewGradedListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    card_type: 'pokemon', grade_company: 'PSA', grade: '',
    population_report: '',
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
    if (!form.grade) {
      setError('Grade is required')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        price: Number(form.price),
        card_type: form.card_type,
        condition: 'graded',
        grade_company: form.grade_company,
        grade: form.grade,
        images: [],
        product_type: 'graded',
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
        <h1 className="text-3xl font-black text-slate-900 mb-2">List a Graded Card</h1>
        <p className="text-slate-600">List PSA, BGS, CGC, or SGC graded cards with certification details</p>
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
            placeholder="e.g. Charizard Base Set 1st Edition PSA 10"
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-6">
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
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Grade Company *</label>
            <select
              value={form.grade_company}
              onChange={e => set('grade_company', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            >
              {GRADE_COMPANIES.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Grade (1-10) *</label>
            <input
              type="number"
              min="1"
              max="10"
              step="0.5"
              value={form.grade}
              onChange={e => set('grade', e.target.value)}
              placeholder="9.5"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
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
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Population Report (optional)</label>
          <input
            value={form.population_report}
            onChange={e => set('population_report', e.target.value)}
            placeholder="e.g. PSA 10 Pop 142"
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Additional details about the card or grading experience..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
        >
          {loading ? 'Creating listing...' : 'List Graded Card'}
        </button>
      </form>
    </main>
  )
}

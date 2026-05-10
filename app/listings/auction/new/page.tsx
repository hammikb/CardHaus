'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CardAutocomplete from '@/components/card-autocomplete'
import PhotoUpload from '@/components/photo-upload'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']

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

export default function NewAuctionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [cardSearchValue, setCardSearchValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_price: '',
    duration_hours: '48',
    card_type: 'pokemon',
    condition: 'near_mint',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleCardSelect(card: Card | null, name: string) {
    setSelectedCard(card)
    setCardSearchValue(card ? card.name : name)
    if (card) {
      set('title', card.name)
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

    const endsAt = new Date()
    endsAt.setHours(endsAt.getHours() + parseInt(form.duration_hours))

    const res = await fetch('/api/auctions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        card_type: form.card_type,
        condition: form.condition,
        price: Number(form.start_price),
        start_price: Number(form.start_price),
        ends_at: endsAt.toISOString(),
        images,
        card_variant_id: selectedCard?.id ?? null,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/auctions/${data.id}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <Link href="/listings/new" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
          ← Back to product type
        </Link>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Create an Auction</h1>
        <p className="text-slate-600">Start a bidding auction for your trading card</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border border-slate-200 p-8">
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Search Card Database</label>
          <CardAutocomplete value={cardSearchValue} onChange={handleCardSelect} />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Charizard Base Set Holo"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Card Type</label>
          <select
            value={form.card_type}
            onChange={(e) => set('card_type', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Condition</label>
          <select
            value={form.condition}
            onChange={(e) => set('condition', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="poor">Poor</option>
            <option value="good">Good</option>
            <option value="excellent">Excellent</option>
            <option value="near_mint">Near Mint</option>
            <option value="mint">Mint</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Starting Bid ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.start_price}
            onChange={(e) => set('start_price', e.target.value)}
            placeholder="10.00"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Auction Duration</label>
          <select
            value={form.duration_hours}
            onChange={(e) => set('duration_hours', e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
            <option value="168">7 days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Description (Optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Add details about condition, any flaws, etc."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>

        <PhotoUpload value={images} onChange={setImages} />

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg transition-colors"
        >
          {loading ? 'Creating Auction...' : 'Start Auction'}
        </button>
      </form>
    </main>
  )
}

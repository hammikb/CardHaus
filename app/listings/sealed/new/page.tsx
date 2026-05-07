'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PhotoUpload from '@/components/photo-upload'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']
const SEALED_TYPES = [
  { value: 'booster_box', label: 'Booster Box' },
  { value: 'booster_pack', label: 'Booster Pack' },
  { value: 'elite_trainer_box', label: 'Elite Trainer Box' },
  { value: 'collection_box', label: 'Collection Box' },
  { value: 'tin', label: 'Tin' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'blister', label: 'Blister Pack' },
  { value: 'other', label: 'Other' },
]
const LANGUAGES = ['English', 'Japanese', 'German', 'French', 'Spanish', 'Italian', 'Chinese', 'Korean', 'Other']

export default function NewSealedListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    card_type: 'pokemon',
    sealed_type: 'booster_box',
    set_name: '',
    language: 'English',
    condition: 'factory_sealed',
    quantity: '1',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
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
        title: form.title,
        description: form.description,
        price: Number(form.price),
        card_type: form.card_type,
        condition: form.condition,
        images,
        product_type: 'sealed',
        sealed_type: form.sealed_type,
        quantity: Number(form.quantity),
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
        <h1 className="text-3xl font-black text-slate-900 mb-2">List a Sealed Product</h1>
        <p className="text-slate-600">List booster boxes, packs, tins, and other sealed TCG products</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border border-slate-200 p-8">
        <div>
          <label className="block text-sm font-bold text-slate-900 mb-2">Title *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Pokemon Scarlet & Violet Base Set Booster Box"
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
            <label className="block text-sm font-bold text-slate-900 mb-2">Product Type *</label>
            <select
              value={form.sealed_type}
              onChange={e => set('sealed_type', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {SEALED_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Set Name</label>
            <input
              value={form.set_name}
              onChange={e => set('set_name', e.target.value)}
              placeholder="e.g. Scarlet & Violet Base Set"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Language *</label>
            <select
              value={form.language}
              onChange={e => set('language', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Condition *</label>
            <select
              value={form.condition}
              onChange={e => set('condition', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="factory_sealed">Factory Sealed</option>
              <option value="opened">Opened</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Quantity *</label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => set('quantity', e.target.value)}
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
          <label className="block text-sm font-bold text-slate-900 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe condition, any damage, manufacturing flaws, etc..."
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
        <PhotoUpload value={images} onChange={setImages} />
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
        >
          {loading ? 'Creating listing...' : 'List Sealed Product'}
        </button>
      </form>
    </main>
  )
}

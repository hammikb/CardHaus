'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ListingCard from '@/components/listing-card'
import EmptyState from '@/components/empty-state'
import { SkeletonGrid } from '@/components/skeleton-card'
import { Listing } from '@/lib/supabase/types'
import { debounce } from '@/lib/utils/debounce'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']
const PRODUCT_TYPES = ['single', 'graded', 'sealed']

async function getListings(searchParams: Record<string, string>) {
  const params = new URLSearchParams({
    ...searchParams,
    product_type: searchParams.product_type || 'single',
  }).toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings?${params}`, { cache: 'no-store' })
  return res.json() as Promise<Listing[]>
}

function MarketplaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({
    product_type: searchParams.get('product_type') || 'single',
    card_type: searchParams.get('card_type') || '',
    condition: searchParams.get('condition') || '',
  })

  // Create debounced filter handler
  const debouncedSetFilter = useRef(
    debounce((filterName: string, value: string) => {
      setFilters(f => ({ ...f, [filterName]: value }))
    }, 100)
  ).current

  // Update URL and fetch listings when filters change
  useEffect(() => {
    const loadListings = async () => {
      setLoading(true)
      const params = Object.entries(filters)
        .filter(([_, v]) => v)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})

      const searchString = new URLSearchParams(params).toString()
      router.push(`/marketplace${searchString ? `?${searchString}` : ''}`)

      const data = await getListings(params)
      setListings(data)
      setLoading(false)
    }

    loadListings()
  }, [filters, router])

  const handleFilterClick = (filterName: string, value: string) => {
    debouncedSetFilter(filterName, value)
  }

  const handleClearFilters = () => {
    setFilters({
      product_type: 'single',
      card_type: '',
      condition: '',
    })
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Marketplace</h1>
        <p className="text-slate-600">Browse {listings.length} cards from verified sellers</p>
      </div>
      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-20">
            <h2 className="font-black text-slate-900 mb-4">Product Type</h2>
            <div className="space-y-2 mb-6">
              {PRODUCT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => handleFilterClick('product_type', t)}
                  className="w-full text-left text-sm font-medium capitalize text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {t}
                </button>
              ))}
              <button
                onClick={handleClearFilters}
                className="w-full text-left text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg transition-colors italic"
              >
                Clear all
              </button>
            </div>
            <h2 className="font-black text-slate-900 mb-4">Card Type</h2>
            <div className="space-y-2 mb-6">
              {CARD_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => handleFilterClick('card_type', t)}
                  className="w-full text-left text-sm font-medium capitalize text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
            <h2 className="font-black text-slate-900 mb-4">Condition</h2>
            <div className="space-y-2">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => handleFilterClick('condition', c)}
                  className="w-full text-left text-sm font-medium capitalize text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1">
          {loading ? (
            <Suspense fallback={<SkeletonGrid count={12} />}>
              <SkeletonGrid count={12} />
            </Suspense>
          ) : listings.length === 0 ? (
            <EmptyState
              title="No listings yet"
              description="Start selling your first card to see it appear here. Explore existing listings or list your first card."
              actionText="List Your First Card"
              actionHref="/listings/new"
              icon="📭"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<SkeletonGrid count={12} />}>
      <MarketplaceContent />
    </Suspense>
  )
}

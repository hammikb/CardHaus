'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ListingCard from '@/components/listing-card'
import EmptyState from '@/components/empty-state'
import { SkeletonGrid } from '@/components/skeleton-card'
import { Listing } from '@/lib/supabase/types'
import { debounce } from '@/lib/utils/debounce'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']
const PRODUCT_TYPES = ['single', 'graded', 'sealed']

function formatLabel(value: string) {
  return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

async function getListings(searchParams: Record<string, string>) {
  const params = new URLSearchParams({
    ...searchParams,
    product_type: searchParams.product_type || 'single',
  }).toString()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/listings?${params}`, { cache: 'no-store' })
    const data = await res.json()
    if (Array.isArray(data)) return data
    return Array.isArray(data.listings) ? data.listings : []
  } catch (error) {
    console.error('Failed to fetch listings:', error)
    return []
  }
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
        .filter(([, v]) => v)
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
    if (filterName === 'product_type') {
      debouncedSetFilter(filterName, value)
      return
    }

    debouncedSetFilter(filterName, filters[filterName] === value ? '' : value)
  }

  const handleClearFilters = () => {
    setFilters({
      product_type: 'single',
      card_type: '',
      condition: '',
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">Marketplace</h1>
            <p className="mt-3 text-base text-slate-600">
              {loading ? 'Finding active listings...' : `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'} available`}
            </p>
          </div>
          <Link
            href="/listings/new"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5"
          >
            List a Card
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
          <aside>
            <div className="sticky top-24 space-y-6 rounded-2xl border border-slate-200 bg-white/80 p-6 backdrop-blur-sm shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Filters</h2>
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                >
                  Reset
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Product Type</h3>
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                  {PRODUCT_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => handleFilterClick('product_type', t)}
                      className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold capitalize transition-all duration-150 ${
                        filters.product_type === t
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Card Type</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
                  {CARD_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => handleFilterClick('card_type', t)}
                      className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold capitalize transition-all duration-150 ${
                        filters.card_type === t
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {formatLabel(t)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">Condition</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {CONDITIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => handleFilterClick('condition', c)}
                      className={`rounded-lg px-3 py-2.5 text-left text-sm font-semibold capitalize transition-all duration-150 ${
                        filters.condition === c
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {formatLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

        <section className="min-w-0">
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </section>
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

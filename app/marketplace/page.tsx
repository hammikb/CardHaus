import { Suspense } from 'react'
import ListingCard from '@/components/listing-card'
import EmptyState from '@/components/empty-state'
import { SkeletonGrid } from '@/components/skeleton-card'
import { Listing } from '@/lib/supabase/types'

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

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const listings = await getListings(params)

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
                <a
                  key={t}
                  href={`/marketplace?product_type=${t}`}
                  className="block text-sm font-medium capitalize text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {t}
                </a>
              ))}
              <a
                href="/marketplace"
                className="block text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg transition-colors italic"
              >
                Clear all
              </a>
            </div>
            <h2 className="font-black text-slate-900 mb-4">Card Type</h2>
            <div className="space-y-2 mb-6">
              {CARD_TYPES.map(t => (
                <a
                  key={t}
                  href={`/marketplace?card_type=${t}`}
                  className="block text-sm font-medium capitalize text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {t}
                </a>
              ))}
              <a
                href="/marketplace"
                className="block text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg transition-colors italic"
              >
                Clear all
              </a>
            </div>
            <h2 className="font-black text-slate-900 mb-4">Condition</h2>
            <div className="space-y-2">
              {CONDITIONS.map(c => (
                <a
                  key={c}
                  href={`/marketplace?condition=${c}`}
                  className="block text-sm font-medium capitalize text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  {c.replace('_', ' ')}
                </a>
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1">
          {listings.length === 0 ? (
            <EmptyState
              title="No listings yet"
              description="Start selling your first card to see it appear here. Explore existing listings or list your first card."
              actionText="List Your First Card"
              actionHref="/listings/new"
              icon="📭"
            />
          ) : (
            <Suspense fallback={<SkeletonGrid count={12} />}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {listings.map(l => <ListingCard key={l.id} listing={l} />)}
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </main>
  )
}

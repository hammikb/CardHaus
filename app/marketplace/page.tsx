import ListingCard from '@/components/listing-card'
import { Listing } from '@/lib/supabase/types'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']

async function getListings(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams).toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings?${params}`, { cache: 'no-store' })
  return res.json() as Promise<Listing[]>
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const listings = await getListings(params)

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Marketplace</h1>
      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <h2 className="font-semibold mb-3">Card Type</h2>
          <div className="space-y-2">
            {CARD_TYPES.map(t => (
              <a key={t} href={`/marketplace?card_type=${t}`}
                className="block text-sm capitalize hover:text-blue-600">{t}</a>
            ))}
            <a href="/marketplace" className="block text-sm text-gray-400 hover:text-blue-600">Clear</a>
          </div>
          <h2 className="font-semibold mt-6 mb-3">Condition</h2>
          <div className="space-y-2">
            {CONDITIONS.map(c => (
              <a key={c} href={`/marketplace?condition=${c}`}
                className="block text-sm capitalize hover:text-blue-600">{c.replace('_', ' ')}</a>
            ))}
          </div>
        </aside>
        <div className="flex-1">
          {listings.length === 0 ? (
            <p className="text-gray-500">No listings found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

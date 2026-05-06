import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ListingCard from '@/components/listing-card'
import EmptyState from '@/components/empty-state'

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

export default async function SealedPage(props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('status', 'active')
    .eq('is_auction', false)
    .eq('product_type', 'sealed')
    .order('created_at', { ascending: false })

  const cardType = searchParams.card_type
  const sealedType = searchParams.sealed_type

  if (cardType) query = query.eq('card_type', cardType)
  if (sealedType) query = query.eq('sealed_type', sealedType)

  const { data: listings, error } = await query

  if (error) {
    console.error('Failed to fetch sealed listings:', error)
  }

  const cards = listings || []

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Sealed Products</h1>
          <p className="text-slate-600">Browse factory sealed booster boxes, packs, and more</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-4">
              <h2 className="font-bold text-slate-900 mb-4">Filters</h2>

              <div className="mb-6">
                <h3 className="font-semibold text-sm text-slate-900 mb-3">Card Type</h3>
                <div className="space-y-2">
                  <Link
                    href="/sealed"
                    className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                      !cardType
                        ? 'bg-blue-100 text-blue-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All Types
                  </Link>
                  {CARD_TYPES.map(type => (
                    <Link
                      key={type}
                      href={`/sealed?card_type=${type}`}
                      className={`block text-sm px-3 py-2 rounded-lg transition-colors capitalize ${
                        cardType === type
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-3">Product Type</h3>
                <div className="space-y-2">
                  <Link
                    href="/sealed"
                    className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                      !sealedType
                        ? 'bg-blue-100 text-blue-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All Products
                  </Link>
                  {SEALED_TYPES.map(type => (
                    <Link
                      key={type.value}
                      href={`/sealed?sealed_type=${type.value}`}
                      className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                        sealedType === type.value
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {type.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {cards.length === 0 ? (
              <EmptyState
                icon="📦"
                title="No sealed products found"
                description="Be the first to list a sealed product"
                actionText="List a Sealed Product"
                actionHref="/listings/sealed/new"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map(card => (
                  <ListingCard
                    key={card.id}
                    listing={card}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

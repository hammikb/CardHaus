import Link from 'next/link'
import { notFound } from 'next/navigation'

import BuyNowButton from '@/components/buy-now-button'
import MarketInsights from '@/components/market-insights'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

type CardListingRow = {
  id: string
  title: string
  condition: string
  price: number
  quantity: number
  profiles?: {
    username: string
    verified_vendor: boolean
  } | null
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(
      '*, profiles(username, verified_vendor), card_variant:card_variants(id, set_name, language, rarity, image_url, cards(id, name, number, image_url))',
    )
    .eq('id', id)
    .single()

  if (!listing || listing.status !== 'active') notFound()

  const coverImage = listing.card_variant?.image_url || listing.card_variant?.cards?.image_url || listing.images?.[0]

  let listingsForCard: CardListingRow[] = []

  if (listing.card_variant_id) {
    const { data: allListings } = await supabase
      .from('listings')
      .select('id, title, condition, price, quantity, profiles(username, verified_vendor)')
      .eq('card_variant_id', listing.card_variant_id)
      .eq('status', 'active')
      .order('price', { ascending: true })

    listingsForCard = (allListings || []).map((item) => ({
      id: item.id,
      title: item.title,
      condition: item.condition,
      price: Number(item.price),
      quantity: Number(item.quantity),
      profiles: Array.isArray(item.profiles) ? (item.profiles[0] ?? null) : (item.profiles ?? null),
    }))
  } else {
    listingsForCard = [
      {
        id: listing.id,
        title: listing.title,
        condition: listing.condition,
        price: Number(listing.price),
        quantity: Number(listing.quantity),
        profiles: listing.profiles,
      },
    ]
  }

  const selectedListing = listingsForCard.find((item) => item.id === listing.id)
  const totalQuantity = listingsForCard.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const cardId = listing.card_variant?.cards?.id ?? null

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[20rem_1fr]">
          <div className="flex flex-col items-center">
            <div className="aspect-[2/3] w-full max-w-xs overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg">
              {coverImage ? (
                <img src={coverImage} alt={listing.title} className="h-full w-full object-contain p-4" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-medium text-slate-400">No image</div>
              )}
            </div>
            <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current offer</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(listing.price)}</p>
              <p className="mt-1 text-sm text-slate-600">
                {selectedListing?.quantity ?? listing.quantity} available from {listing.profiles?.username ?? 'seller'}
              </p>
              <div className="mt-4">
                <BuyNowButton listingId={listing.id} maxQuantity={selectedListing?.quantity ?? listing.quantity} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-6">
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
                {listing.card_type}
              </span>
            </div>
            <h1 className="mb-6 text-4xl font-black leading-tight text-slate-950 lg:text-5xl">{listing.title}</h1>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Set</p>
                <p className="mt-2 font-semibold text-slate-950">{listing.card_variant?.set_name || 'Unknown set'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Language</p>
                <p className="mt-2 font-semibold text-slate-950">{listing.card_variant?.language || 'English'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Card Number</p>
                <p className="mt-2 font-semibold text-slate-950">{listing.card_variant?.cards?.number || '--'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Open Inventory</p>
                <p className="mt-2 font-semibold text-slate-950">{totalQuantity || listing.quantity} copies</p>
              </div>
            </div>

            {listing.grade && (
              <div className="mb-6 mt-6">
                <span className="inline-block rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                  {listing.grade_company} {listing.grade}
                </span>
              </div>
            )}

            {listing.description && (
              <p className="mb-8 mt-6 text-lg leading-relaxed text-slate-700">{listing.description}</p>
            )}

            {cardId && (
              <div className="mt-8">
                <MarketInsights cardId={cardId} variantId={listing.card_variant?.id} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 space-y-6">
          <div>
            <h2 className="mb-2 text-3xl font-black text-slate-950">Available from sellers</h2>
            <p className="text-sm text-slate-600">
              {listingsForCard.length} seller{listingsForCard.length === 1 ? '' : 's'} offering {totalQuantity} total card{totalQuantity === 1 ? '' : 's'} right now.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Seller</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Condition</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Quantity</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-900">Price</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {listingsForCard.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-blue-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${item.id === listing.id ? 'bg-blue-50/70' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.profiles?.username}</span>
                        {item.profiles?.verified_vendor && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            ✓
                          </span>
                        )}
                        {item.id === listing.id && (
                          <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
                            Active view
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium capitalize text-slate-700">
                      {item.condition.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{item.quantity}</td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-slate-950">{formatCurrency(item.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/listings/${item.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                        >
                          View
                        </Link>
                        <BuyNowButton listingId={item.id} maxQuantity={item.quantity} compact />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

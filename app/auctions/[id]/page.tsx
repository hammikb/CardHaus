import { createClient } from '@/lib/supabase/server'
import BidForm from '@/components/bid-form'
import { notFound } from 'next/navigation'

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, listings(*, profiles(username, verified_vendor))')
    .eq('id', id)
    .single()

  if (!auction || !auction.listings) notFound()

  const listing = auction.listings
  const ended = new Date(auction.ends_at) <= new Date()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {listing.images[0] ? (
            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500 capitalize mb-1">{listing.card_type} · {listing.condition.replace('_', ' ')}</p>
          <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
          <p className="text-sm text-gray-500 mb-4">
            Sold by <span className="font-medium">{listing.profiles?.username}</span>
            {listing.profiles?.verified_vendor && <span className="ml-1 text-blue-600">✓ Verified</span>}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Ends: {new Date(auction.ends_at).toLocaleString()} · {auction.bid_count} bids
          </p>
          {listing.description && <p className="text-gray-700 mb-4">{listing.description}</p>}
          {user ? (
            <BidForm
              auctionId={auction.id}
              initialBid={auction.current_bid}
              startPrice={auction.start_price}
              endsAt={auction.ends_at}
              listingId={listing.id}
            />
          ) : (
            <a href="/auth/login" className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700">
              Sign in to Bid
            </a>
          )}
        </div>
      </div>
    </main>
  )
}

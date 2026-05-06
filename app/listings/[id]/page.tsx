import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import BuyNowButton from '@/components/buy-now-button'
import { notFound } from 'next/navigation'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('id', id)
    .single()

  if (!listing || listing.status !== 'active') notFound()

  const isOwner = user?.id === listing.seller_id

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
          {listing.grade && (
            <p className="text-sm text-gray-600 mb-2">{listing.grade_company} {listing.grade}</p>
          )}
          <p className="text-3xl font-bold text-blue-600 mb-4">{formatCurrency(listing.price)}</p>
          {listing.description && <p className="text-gray-700 mb-6">{listing.description}</p>}
          <p className="text-sm text-gray-500 mb-6">
            Sold by <span className="font-medium">{listing.profiles?.username}</span>
            {listing.profiles?.verified_vendor && <span className="ml-1 text-blue-600">✓ Verified</span>}
          </p>
          {isOwner ? (
            <p className="text-gray-500 text-sm">This is your listing.</p>
          ) : user ? (
            <BuyNowButton listingId={listing.id} />
          ) : (
            <a href="/auth/login" className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700">
              Sign in to Buy
            </a>
          )}
        </div>
      </div>
    </main>
  )
}

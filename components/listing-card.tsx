import Link from 'next/link'
import { Listing } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'

export default function ListingCard({ listing }: { listing: Listing & { profiles?: { username: string; verified_vendor: boolean } } }) {
  return (
    <Link href={`/listings/${listing.id}`} className="block bg-white rounded-lg border hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
        {listing.images[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm truncate">{listing.title}</p>
        <p className="text-blue-600 font-bold mt-1">{formatCurrency(listing.price)}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 capitalize">{listing.condition.replace('_', ' ')}</span>
          <span className="text-xs text-gray-400 capitalize">{listing.card_type}</span>
        </div>
        {listing.profiles && (
          <p className="text-xs text-gray-400 mt-1">
            {listing.profiles.username}
            {listing.profiles.verified_vendor && ' ✓'}
          </p>
        )}
      </div>
    </Link>
  )
}

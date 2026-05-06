import Link from 'next/link'
import { Listing } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'

export default function ListingCard({ listing }: { listing: Listing & { profiles?: { username: string; verified_vendor: boolean } } }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-xl border border-slate-200 hover:border-blue-300 overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-105 group"
    >
      <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden relative">
        {listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No image</div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-sm text-slate-900 truncate line-clamp-2 h-10">{listing.title}</p>
        <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
          {formatCurrency(listing.price)}
        </p>
        <div className="flex items-center justify-between mt-3 gap-2">
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full capitalize">
            {listing.condition.replace('_', ' ')}
          </span>
          <span className="text-xs font-medium text-slate-500 capitalize">{listing.card_type}</span>
        </div>
        {listing.profiles && (
          <div className="flex items-center gap-1 mt-3 text-xs">
            <span className="text-slate-600">{listing.profiles.username}</span>
            {listing.profiles.verified_vendor && <span className="text-blue-600 font-bold">✓</span>}
          </div>
        )}
      </div>
    </Link>
  )
}

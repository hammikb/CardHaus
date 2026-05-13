import Link from 'next/link'
import Image from 'next/image'
import { Listing } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'

type ListingCardData = Listing & {
  profiles?: {
    username: string
    verified_vendor: boolean
  } | null
  card_variant?: {
    set_name?: string | null
    rarity?: string | null
    image_url: string | null
    cards?: { image_url: string | null; number?: string | null } | null
  } | null
}

function getCoverImage(listing: ListingCardData) {
  return listing.card_variant?.image_url || listing.card_variant?.cards?.image_url || listing.images?.[0]
}

export default function ListingCard({ listing }: { listing: ListingCardData }) {
  const coverImage = getCoverImage(listing)

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
      </div>
      <div className="border-t border-slate-100 p-4">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950">{listing.title}</p>
        {listing.card_variant?.set_name && (
          <p className="mt-2 truncate text-xs font-medium text-slate-500">
            {listing.card_variant.set_name}
            {listing.card_variant.rarity ? ` • ${listing.card_variant.rarity}` : ''}
          </p>
        )}
        <p className="mt-3 text-xl font-black tracking-tight text-slate-950">
          {formatCurrency(listing.price)}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
            {listing.condition.replace('_', ' ')}
          </span>
          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
            Qty {listing.quantity}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate">{listing.profiles?.username ?? 'CardHaus seller'}</span>
          <span className="font-semibold uppercase tracking-wide text-slate-400">{listing.card_type}</span>
        </div>
      </div>
    </Link>
  )
}

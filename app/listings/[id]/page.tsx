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
    .select('*, profiles(username, verified_vendor), card_variant:card_variants(set_name, language, image_url, cards(name, image_url))')
    .eq('id', id)
    .single()

  if (!listing || listing.status !== 'active') notFound()

  const isOwner = user?.id === listing.seller_id
  const coverImage = listing.card_variant?.image_url || listing.card_variant?.cards?.image_url || listing.images?.[0]
  const sellerPhotos = listing.images || []

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden shadow-lg">
            {coverImage ? (
              <img src={coverImage} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-medium">No image</div>
            )}
          </div>
          {sellerPhotos.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">Seller photos</h2>
              <div className="grid grid-cols-3 gap-3">
                {sellerPhotos.map((image: string) => (
                  <div key={image} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={image} alt={`${listing.title} seller photo`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full capitalize">
              {listing.card_type}
            </span>
            <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full capitalize">
              {listing.condition.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-3">{listing.title}</h1>
          {listing.grade && (
            <p className="text-sm font-semibold text-blue-600 mb-4 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
              {listing.grade_company} {listing.grade}
            </p>
          )}
          <p className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            {formatCurrency(listing.price)}
          </p>
          {listing.description && (
            <p className="text-slate-700 leading-relaxed mb-8 text-lg">{listing.description}</p>
          )}
          <div className="border-t border-slate-200 pt-6 mb-8">
            <p className="text-sm text-slate-600 mb-2">Sold by</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-lg">{listing.profiles?.username}</span>
              {listing.profiles?.verified_vendor && (
                <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full text-xs">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
          {isOwner ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-slate-700 font-semibold">This is your listing</p>
            </div>
          ) : user ? (
            <BuyNowButton listingId={listing.id} />
          ) : (
            <a
              href="/auth/login"
              className="block w-full text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Sign in to Buy
            </a>
          )}
        </div>
      </div>
    </main>
  )
}

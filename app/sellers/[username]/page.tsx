import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import { notFound } from 'next/navigation'

export default async function StorefrontPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, storefronts(*)')
    .eq('username', username)
    .single()

  if (!profile || !profile.verified_vendor) notFound()

  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('seller_id', profile.id)
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(username)')
    .eq('seller_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null

  const storefront = profile.storefronts?.[0]

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {storefront?.banner_image && (
        <div className="h-48 bg-gray-200 rounded-lg overflow-hidden mb-6">
          <img src={storefront.banner_image} alt="Store banner" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{storefront?.shop_name ?? profile.username}</h1>
          <span className="text-blue-600 text-sm font-medium">✓ Verified Vendor</span>
        </div>
        {avgRating && (
          <p className="text-sm text-gray-500">{'★'.repeat(Math.round(avgRating))} {avgRating.toFixed(1)} ({reviews?.length} reviews)</p>
        )}
        {storefront?.description && <p className="text-gray-600 mt-2">{storefront.description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Listings ({listings?.length ?? 0})</h2>
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <p className="text-gray-500">No active listings.</p>
          )}
        </div>

        <div>
          {storefront?.policies && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Shop Policies</h2>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{storefront.policies}</p>
            </div>
          )}
          <h2 className="text-lg font-bold mb-3">Reviews</h2>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{r.profiles?.username}</span>
                    <span>{'★'.repeat(r.rating)}</span>
                  </div>
                  {r.body && <p className="text-sm text-gray-600">{r.body}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No reviews yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}

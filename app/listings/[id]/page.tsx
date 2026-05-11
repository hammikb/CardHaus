import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'

type CardListingRow = {
  id: string
  condition: string
  price: number
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
    .select('*, profiles(username, verified_vendor), card_variant:card_variants(id, set_name, language, image_url, cards(name, image_url))')
    .eq('id', id)
    .single()

  if (!listing || listing.status !== 'active') notFound()

  const coverImage = listing.card_variant?.image_url || listing.card_variant?.cards?.image_url || listing.images?.[0]

  // Get all listings for this card variant
  const { data: allListings } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('card_variant_id', listing.card_variant_id)
    .eq('status', 'active')
    .order('price', { ascending: true })

  const listingsForCard = (allListings || []) as CardListingRow[]

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
        <div className="lg:col-span-1 flex flex-col items-center">
          <div className="w-full aspect-[2/3] bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-400 max-w-xs">
            {coverImage ? (
              <img src={coverImage} alt={listing.title} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-medium">No image</div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-black text-slate-900 mb-4">{listing.title}</h1>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full capitalize">
              {listing.card_type}
            </span>
            {listing.grade && (
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                {listing.grade_company} {listing.grade}
              </span>
            )}
          </div>
          {listing.description && (
            <p className="text-slate-700 leading-relaxed mb-6 text-lg">{listing.description}</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-900 mb-6">Buy from sellers</h2>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 font-bold text-slate-900">Seller</th>
                <th className="text-left px-6 py-4 font-bold text-slate-900">Condition</th>
                <th className="text-left px-6 py-4 font-bold text-slate-900">Price</th>
                <th className="text-right px-6 py-4 font-bold text-slate-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {listingsForCard.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.profiles?.username}</span>
                      {item.profiles?.verified_vendor && (
                        <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-200 text-slate-700 capitalize">
                    {item.condition.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 border-b border-slate-200">
                    <span className="font-bold text-lg text-slate-900">{formatCurrency(item.price)}</span>
                  </td>
                  <td className="px-6 py-4 border-b border-slate-200 text-right">
                    <Link
                      href={`/listings/${item.id}`}
                      className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

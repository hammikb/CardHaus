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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          <div className="lg:col-span-1 flex flex-col items-center">
            <div className="w-full max-w-xs aspect-[2/3] bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-300">
              {coverImage ? (
                <img src={coverImage} alt={listing.title} className="w-full h-full object-contain p-4" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-lg font-medium">No image</div>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="mb-6">
              <span className="inline-block px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
                {listing.card_type}
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-950 mb-6 leading-tight">{listing.title}</h1>
            {listing.grade && (
              <div className="mb-6">
                <span className="inline-block px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-900">
                  🏆 {listing.grade_company} {listing.grade}
                </span>
              </div>
            )}
            {listing.description && (
              <p className="text-slate-700 leading-relaxed mb-8 text-lg">{listing.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black text-slate-950 mb-6">Available from sellers</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-4 font-bold text-slate-900 text-sm">Seller</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-900 text-sm">Condition</th>
                  <th className="text-left px-6 py-4 font-bold text-slate-900 text-sm">Price</th>
                  <th className="text-right px-6 py-4 font-bold text-slate-900 text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {listingsForCard.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.profiles?.username}</span>
                        {item.profiles?.verified_vendor && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                            ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 capitalize font-medium">
                      {item.condition.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-lg text-slate-950">{formatCurrency(item.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/listings/${item.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5"
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
      </div>
    </main>
  )
}

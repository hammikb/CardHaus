import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import Link from 'next/link'
import { Listing } from '@/lib/supabase/types'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: recent } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <main>
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white py-28 px-4">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-300 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            Buy & Sell Trading Cards
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-95 font-light">
            The marketplace for Pokémon, MTG, Sports Cards, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all text-lg"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/listings/new"
              className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-lg backdrop-blur-sm"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-900 mb-2">Recently Listed</h2>
            <p className="text-slate-600">New cards added every day from verified sellers</p>
          </div>
          <Link href="/marketplace" className="text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline">
            View all →
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {recent.map((l: Listing) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500 text-lg">No listings yet. Be the first to sell!</p>
          </div>
        )}
      </section>
    </main>
  )
}

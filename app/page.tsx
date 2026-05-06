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
      <section className="bg-blue-600 text-white py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Buy & Sell Trading Cards</h1>
        <p className="text-xl mb-8 opacity-90">Pokémon, MTG, Sports Cards, and more.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/marketplace" className="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg hover:bg-blue-50">
            Browse Marketplace
          </Link>
          <Link href="/listings/new" className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700">
            Start Selling
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Recently Listed</h2>
          <Link href="/marketplace" className="text-blue-600 hover:underline text-sm">View all →</Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {recent.map((l: Listing) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <p className="text-gray-500">No listings yet. Be the first to sell!</p>
        )}
      </section>
    </main>
  )
}

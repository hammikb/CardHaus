import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function AuctionsPage() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: auctions } = await supabase
    .from('auctions')
    .select('*, listings(id, title, images, card_type, condition)')
    .gt('ends_at', now)
    .order('ends_at', { ascending: true })

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Auctions</h1>
        <Link href="/auctions/new" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          + Create Auction
        </Link>
      </div>
      {auctions && auctions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map(a => (
            <Link key={a.id} href={`/auctions/${a.id}`}
              className="block bg-white border rounded-lg hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                {a.listings?.images?.[0] ? (
                  <img src={a.listings.images[0]} alt={a.listings.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold truncate">{a.listings?.title}</p>
                <p className="text-blue-600 font-bold mt-1">
                  {a.current_bid ? formatCurrency(a.current_bid) : `Starts at ${formatCurrency(a.start_price)}`}
                </p>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{a.bid_count} bids</span>
                  <span>Ends {new Date(a.ends_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No active auctions.</p>
      )}
    </main>
  )
}

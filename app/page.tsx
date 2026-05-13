import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import Link from 'next/link'
import { Listing } from '@/lib/supabase/types'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: recent } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor), card_variant:card_variants(set_name, rarity, image_url, cards(image_url))')
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 text-white py-32 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-15 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white/80 backdrop-blur-sm">
              The Trading Card Marketplace
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
            Buy & Sell Trading Cards
          </h1>
          <p className="text-lg sm:text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Discover rare cards, connect with collectors, and build your collection. Secure, verified, and trusted.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-white text-slate-900 font-bold text-base sm:text-lg transition-all duration-200 hover:bg-slate-50 hover:shadow-xl hover:shadow-blue-500/20 active:translate-y-0.5"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/listings/new"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border-2 border-white/30 text-white font-bold text-base sm:text-lg transition-all duration-200 hover:border-white/50 hover:bg-white/5 backdrop-blur-sm active:translate-y-0.5"
            >
              List Your Cards
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Live inventory</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{recent?.reduce((sum, listing) => sum + Number(listing.quantity || 0), 0) ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Active sellers</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{new Set((recent || []).map((listing) => listing.seller_id)).size}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Market context</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Listing pages now surface seller inventory and live market pricing.</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20 sm:py-28">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8 mb-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 mb-3">Recently Listed</h2>
            <p className="text-base text-slate-600">New additions every day from our community of sellers</p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
          >
            Explore all
            <span className="ml-2">→</span>
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {recent.map((l: Listing) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 py-16 text-center">
            <p className="text-slate-600 text-base mb-4">No listings yet</p>
            <p className="text-slate-500 text-sm">Be the first to add cards to the marketplace</p>
          </div>
        )}
      </section>
    </main>
  )
}

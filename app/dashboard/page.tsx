import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ count: listingCount }, { count: orderCount }] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', user.id),
  ])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-950 mb-3">Seller Dashboard</h1>
          <p className="text-slate-600 text-lg">Manage your listings, track orders, and grow your business</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Active Listings</p>
                <p className="text-5xl font-black text-slate-950">
                  {listingCount ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
                📦
              </div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Total Orders</p>
                <p className="text-5xl font-black text-slate-950">
                  {orderCount ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-xl">
                ✓
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/listings/new"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-bold text-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5"
          >
            + Create Listing
          </Link>
          <Link
            href="/dashboard/listings"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-400"
          >
            Manage Listings
          </Link>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-400"
          >
            View Orders
          </Link>
        </div>
      </div>
    </main>
  )
}

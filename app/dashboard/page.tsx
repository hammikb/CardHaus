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
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Seller Dashboard</h1>
        <p className="text-slate-600">Manage your listings and view orders</p>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-slate-200 rounded-xl p-8 hover:shadow-lg transition-shadow">
          <p className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {listingCount ?? 0}
          </p>
          <p className="text-slate-600 mt-2 font-medium">Active Listings</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-8 hover:shadow-lg transition-shadow">
          <p className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {orderCount ?? 0}
          </p>
          <p className="text-slate-600 mt-2 font-medium">Total Orders</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/listings/new"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all text-center"
        >
          + New Listing
        </Link>
        <Link
          href="/dashboard/listings"
          className="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all text-center"
        >
          Manage Listings
        </Link>
        <Link
          href="/dashboard/orders"
          className="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all text-center"
        >
          View Orders
        </Link>
      </div>
    </main>
  )
}

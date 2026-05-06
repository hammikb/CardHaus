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
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Seller Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold">{listingCount ?? 0}</p>
          <p className="text-gray-500 mt-1">Active Listings</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold">{orderCount ?? 0}</p>
          <p className="text-gray-500 mt-1">Total Orders</p>
        </div>
      </div>
      <div className="flex gap-4">
        <Link href="/listings/new" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          + New Listing
        </Link>
        <Link href="/dashboard/listings" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          Manage Listings
        </Link>
        <Link href="/dashboard/orders" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          View Orders
        </Link>
      </div>
    </main>
  )
}

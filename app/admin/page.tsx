import { requireAdmin } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPage() {
  const { supabase } = await requireAdmin()

  const [{ count: pendingVendors }, { count: openDisputes }, { data: revenueData }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller').eq('verified_vendor', false),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabase.from('orders').select('platform_fee').eq('status', 'delivered'),
  ])

  const totalRevenue = revenueData?.reduce((sum, o) => sum + o.platform_fee, 0) ?? 0

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
          <p className="text-gray-500 mt-1">Platform Revenue</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold text-yellow-600">{pendingVendors ?? 0}</p>
          <p className="text-gray-500 mt-1">Vendor Applications</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold text-red-600">{openDisputes ?? 0}</p>
          <p className="text-gray-500 mt-1">Open Disputes</p>
        </div>
      </div>
      <div className="flex gap-4">
        <Link href="/admin/vendors" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          Review Vendor Applications
        </Link>
        <Link href="/admin/disputes" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          Manage Disputes
        </Link>
      </div>
    </main>
  )
}

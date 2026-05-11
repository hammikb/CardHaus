import { requireAdmin } from '@/lib/auth'
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
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-950 mb-3">Admin Dashboard</h1>
          <p className="text-slate-600">Platform metrics and moderation tools</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:border-slate-300 transition-all">
            <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Platform Revenue</p>
            <p className="text-4xl font-black text-slate-950">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:border-slate-300 transition-all">
            <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Pending Vendors</p>
            <p className="text-4xl font-black text-amber-600">{pendingVendors ?? 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:border-slate-300 transition-all">
            <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">Open Disputes</p>
            <p className="text-4xl font-black text-red-600">{openDisputes ?? 0}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin/vendors"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-bold text-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5"
          >
            Review Vendor Applications
          </Link>
          <Link
            href="/admin/disputes"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-400"
          >
            Manage Disputes
          </Link>
        </div>
      </div>
    </main>
  )
}

import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function DashboardOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(title)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="space-y-3">
        {orders?.map(o => (
          <div key={o.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{o.listings?.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Total: {formatCurrency(o.total)} · Your payout: {formatCurrency(o.total - o.platform_fee)}
                </p>
                {o.tracking_number && (
                  <p className="text-sm text-gray-400 mt-1">Tracking: {o.tracking_number}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${
                o.status === 'paid' ? 'bg-yellow-100 text-yellow-700' :
                o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>{o.status}</span>
            </div>
          </div>
        ))}
        {!orders?.length && <p className="text-gray-500">No orders yet.</p>}
      </div>
    </main>
  )
}

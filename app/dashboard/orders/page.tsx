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
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 mb-1">Orders</h1>
        <p className="text-slate-600">{orders?.length ?? 0} total orders</p>
      </div>
      <div className="space-y-3">
        {orders?.map(o => (
          <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className="font-bold text-slate-900">{o.listings?.title}</p>
                <div className="text-sm text-slate-600 mt-2 space-y-1">
                  <p>
                    Total: <span className="font-semibold text-slate-900">{formatCurrency(o.total)}</span> · Your payout:{' '}
                    <span className="font-semibold text-green-600">{formatCurrency(o.total - o.platform_fee)}</span>
                  </p>
                  {o.tracking_number && <p className="text-slate-500">Tracking: {o.tracking_number}</p>}
                </div>
              </div>
              <span
                className={`text-xs px-4 py-2 rounded-lg font-bold capitalize whitespace-nowrap ${
                  o.status === 'paid'
                    ? 'bg-yellow-100 text-yellow-700'
                    : o.status === 'shipped'
                      ? 'bg-blue-100 text-blue-700'
                      : o.status === 'delivered'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                }`}
              >
                {o.status}
              </span>
            </div>
          </div>
        ))}
        {!orders?.length && (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <p className="text-slate-500 font-medium">No orders yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}

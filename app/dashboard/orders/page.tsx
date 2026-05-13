import EmptyState from '@/components/empty-state'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function DashboardOrdersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(title)')
    .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="mb-1 text-3xl font-black text-slate-900">Orders</h1>
        <p className="text-slate-600">{orders?.length ?? 0} total order{orders?.length === 1 ? '' : 's'}</p>
      </div>
      <div className="space-y-3">
        {orders?.map((order) => {
          const isSale = order.seller_id === user.id

          return (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{order.listings?.title}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {isSale ? 'Sale' : 'Purchase'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>
                      Total: <span className="font-semibold text-slate-900">{formatCurrency(Number(order.total))}</span>
                      {' '}· Qty:{' '}
                      <span className="font-semibold text-slate-900">{order.quantity}</span>
                      {isSale && (
                        <>
                          {' '}· Your payout:{' '}
                          <span className="font-semibold text-green-600">
                            {formatCurrency(Number(order.total) - Number(order.platform_fee))}
                          </span>
                        </>
                      )}
                    </p>
                    {order.tracking_number && <p className="text-slate-500">Tracking: {order.tracking_number}</p>}
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold capitalize ${
                    order.status === 'paid'
                      ? 'bg-yellow-100 text-yellow-700'
                      : order.status === 'shipped'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          )
        })}
        {!orders?.length && (
          <EmptyState
            title="No orders yet"
            description="Once you buy or sell a card, the order will appear here."
            actionText="Browse Marketplace"
            actionHref="/marketplace"
            icon="Box"
          />
        )}
      </div>
    </main>
  )
}

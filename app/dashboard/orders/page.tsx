import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/empty-state'

export default async function DashboardOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(title)')
    .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 mb-1">Orders</h1>
        <p className="text-slate-600">{orders?.length ?? 0} total order{orders?.length === 1 ? '' : 's'}</p>
      </div>
      <div className="space-y-3">
        {orders?.map(o => {
          const isSale = o.seller_id === user.id
          return (
            <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{o.listings?.title}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {isSale ? 'Sale' : 'Purchase'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2 space-y-1">
                    <p>
                      Total: <span className="font-semibold text-slate-900">{formatCurrency(Number(o.total))}</span>
                      {isSale && (
                        <>
                          {' '}· Your payout:{' '}
                          <span className="font-semibold text-green-600">{formatCurrency(Number(o.total) - Number(o.platform_fee))}</span>
                        </>
                      )}
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

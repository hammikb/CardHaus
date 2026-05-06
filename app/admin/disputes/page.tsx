import { requireAdmin } from '@/lib/auth'
import DisputeActions from './dispute-actions'

export default async function AdminDisputesPage() {
  const { supabase } = await requireAdmin()

  const { data: disputes } = await supabase
    .from('orders')
    .select('*, listings(title), buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)')
    .eq('status', 'disputed')
    .order('created_at', { ascending: true })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Open Disputes</h1>
      {disputes && disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map(d => (
            <div key={d.id} className="bg-white border border-red-200 rounded-lg p-4">
              <p className="font-semibold">{d.listings?.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                Buyer: {(d.buyer as { username?: string })?.username} · Seller: {(d.seller as { username?: string })?.username} · Total: ${d.total}
              </p>
              <DisputeActions orderId={d.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No open disputes.</p>
      )}
    </main>
  )
}

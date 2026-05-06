import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LabelForm from './label-form'

export default async function LabelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(title)')
    .eq('seller_id', user.id)
    .eq('status', 'paid')
    .is('easypost_shipment_id', null)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Generate Shipping Labels</h1>
      {orders && orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(o => (
            <div key={o.id} className="bg-white border rounded-lg p-6">
              <p className="font-semibold mb-4">{o.listings?.title}</p>
              <LabelForm orderId={o.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No orders awaiting shipping labels.</p>
      )}
    </main>
  )
}

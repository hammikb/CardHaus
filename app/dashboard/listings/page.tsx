import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Link href="/listings/new" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          + New Listing
        </Link>
      </div>
      <div className="space-y-3">
        {listings?.map(l => (
          <div key={l.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm text-gray-500 capitalize">{l.card_type} · {l.condition.replace('_', ' ')} · {formatCurrency(l.price)}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${
              l.status === 'active' ? 'bg-green-100 text-green-700' :
              l.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
            }`}>{l.status}</span>
          </div>
        ))}
        {!listings?.length && <p className="text-gray-500">No listings yet.</p>}
      </div>
    </main>
  )
}

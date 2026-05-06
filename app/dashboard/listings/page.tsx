import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/empty-state'

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
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">My Listings</h1>
          <p className="text-slate-600">{listings?.length ?? 0} total</p>
        </div>
        <Link
          href="/listings/new"
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          + New Listing
        </Link>
      </div>
      <div className="space-y-3">
        {listings?.map(l => (
          <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex-1">
              <p className="font-bold text-slate-900">{l.title}</p>
              <p className="text-sm text-slate-600 mt-1 capitalize">
                {l.card_type} · {l.condition.replace('_', ' ')} · <span className="font-semibold text-blue-600">{formatCurrency(l.price)}</span>
              </p>
            </div>
            <span
              className={`text-xs px-4 py-2 rounded-lg font-bold capitalize whitespace-nowrap ml-4 ${
                l.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : l.status === 'sold'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {l.status}
            </span>
          </div>
        ))}
        {!listings?.length && (
          <EmptyState
            title="No listings yet"
            description="Start by creating your first listing. You can add photos, set a price, and reach buyers immediately."
            actionText="Create First Listing"
            actionHref="/listings/new"
            icon="🎯"
          />
        )}
      </div>
    </main>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type SuccessSearchParams = Promise<{ session_id?: string }>

export default async function OrderSuccessPage({ searchParams }: { searchParams: SuccessSearchParams }) {
  const { session_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  let order = null
  let pending = false

  if (session_id) {
    const session = await getStripe().checkout.sessions.retrieve(session_id)
    const listingId = session.metadata?.listing_id
    const buyerId = session.metadata?.buyer_id

    if (buyerId === user.id && listingId) {
      const { data } = await supabase
        .from('orders')
        .select('*, listings(title)')
        .eq('listing_id', listingId)
        .eq('buyer_id', user.id)
        .maybeSingle()

      order = data
      pending = !data
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
            ✓
          </div>
          <h1 className="mb-3 text-3xl font-black text-slate-950">Payment received</h1>
          {order ? (
            <div className="space-y-4">
              <p className="text-slate-600">
                Your order for <span className="font-semibold text-slate-900">{order.listings?.title}</span> is confirmed.
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-600">Order total</span>
                  <span className="font-bold text-slate-950">{formatCurrency(Number(order.total))}</span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-slate-600">Status</span>
                  <span className="font-bold capitalize text-green-700">{order.status}</span>
                </div>
              </div>
            </div>
          ) : pending ? (
            <p className="text-slate-600">
              Stripe confirmed the payment. CardHaus is finishing the order record now, which can take a few seconds.
            </p>
          ) : (
            <p className="text-slate-600">
              We could not find a matching order for this checkout session.
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard/orders" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
              View orders
            </Link>
            <Link href="/marketplace" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50">
              Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

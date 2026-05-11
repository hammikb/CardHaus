import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  return supabaseAdmin
}

async function updateStripeAccountStatus(account: Stripe.Account) {
  const supabase = getSupabaseAdmin()
  const onboarded = Boolean(account.details_submitted && account.charges_enabled && account.payouts_enabled)

  await supabase
    .from('profiles')
    .update({ stripe_onboarded: onboarded })
    .eq('stripe_account_id', account.id)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const supabase = getSupabaseAdmin()
    const session = event.data.object
    const { listing_id, buyer_id, seller_id } = session.metadata || {}

    if (!listing_id || !buyer_id || !seller_id) {
      return NextResponse.json({ error: 'Missing checkout metadata' }, { status: 400 })
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('price')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const platformFee = Math.round(listing.price * Number(process.env.PLATFORM_FEE_PERCENT ?? 10)) / 100

    const { error: orderError } = await supabase.from('orders').upsert({
      buyer_id,
      seller_id,
      listing_id,
      total: listing.price,
      platform_fee: platformFee,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      status: 'paid',
    }, { onConflict: 'listing_id' })

    if (orderError) {
      console.error('Stripe webhook order upsert error:', orderError)
      return NextResponse.json({ error: 'Unable to create order' }, { status: 500 })
    }

    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing_id)
  }

  if (event.type === 'account.updated') {
    await updateStripeAccountStatus(event.data.object)
  }

  return NextResponse.json({ received: true })
}

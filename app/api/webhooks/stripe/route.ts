import { calculatePlatformFee } from '@/lib/utils'
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
    const quantity = Number(session.metadata?.quantity ?? 1)
    const unitPrice = Number(session.metadata?.unit_price ?? 0)
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null

    if (!listing_id || !buyer_id || !seller_id) {
      return NextResponse.json({ error: 'Missing checkout metadata' }, { status: 400 })
    }

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing payment intent id' }, { status: 400 })
    }

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json({ received: true })
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('id')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const { error: purchaseError } = await supabase.rpc('apply_listing_purchase', {
      p_listing_id: listing_id,
      p_purchase_quantity: quantity,
    })

    if (purchaseError) {
      console.error('Stripe webhook inventory update error:', purchaseError)
      return NextResponse.json({ error: 'Unable to update listing inventory' }, { status: 409 })
    }

    const total = typeof session.amount_total === 'number'
      ? Math.round(session.amount_total) / 100
      : Math.round(unitPrice * quantity * 100) / 100
    const normalizedUnitPrice = unitPrice > 0 ? unitPrice : Math.round((total / quantity) * 100) / 100
    const platformFee = calculatePlatformFee(total)

    const { error: orderError } = await supabase.from('orders').upsert({
      buyer_id,
      seller_id,
      listing_id,
      quantity,
      unit_price: normalizedUnitPrice,
      total,
      platform_fee: platformFee,
      stripe_payment_intent_id: paymentIntentId,
      status: 'paid',
    }, { onConflict: 'stripe_payment_intent_id' })

    if (orderError) {
      console.error('Stripe webhook order upsert error:', orderError)
      return NextResponse.json({ error: 'Unable to create order' }, { status: 500 })
    }
  }

  if (event.type === 'account.updated') {
    await updateStripeAccountStatus(event.data.object)
  }

  return NextResponse.json({ received: true })
}

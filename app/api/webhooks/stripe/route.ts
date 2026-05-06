import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { listing_id, buyer_id, seller_id } = session.metadata!

    const { data: listing } = await supabase
      .from('listings')
      .select('price')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const platformFee = Math.round(listing.price * Number(process.env.PLATFORM_FEE_PERCENT ?? 10)) / 100

    await supabase.from('orders').insert({
      buyer_id,
      seller_id,
      listing_id,
      total: listing.price,
      platform_fee: platformFee,
      stripe_payment_intent_id: session.payment_intent,
      status: 'paid',
    })

    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing_id)
  }

  return NextResponse.json({ received: true })
}

import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { calculatePlatformFee } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id } = await request.json()
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const { data: listing } = await supabase
    .from('listings')
    .select('*, profiles(stripe_account_id, stripe_onboarded)')
    .eq('id', listing_id)
    .eq('status', 'active')
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'Cannot buy own listing' }, { status: 400 })
  if (!listing.profiles?.stripe_onboarded) return NextResponse.json({ error: 'Seller not onboarded' }, { status: 400 })

  const priceInCents = Math.round(listing.price * 100)
  const feeInCents = Math.round(calculatePlatformFee(listing.price) * 100)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: listing.title, images: listing.images.slice(0, 1) },
        unit_amount: priceInCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing_id}`,
    payment_intent_data: {
      application_fee_amount: feeInCents,
      transfer_data: { destination: listing.profiles.stripe_account_id! },
    },
    metadata: { listing_id, buyer_id: user.id, seller_id: listing.seller_id },
  })

  return NextResponse.json({ url: session.url })
}

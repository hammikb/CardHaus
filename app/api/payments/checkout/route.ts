import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { calculatePlatformFee } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
    if (!listing.profiles?.stripe_account_id) return NextResponse.json({ error: 'Seller has not connected Stripe yet' }, { status: 400 })
    if (!listing.profiles.stripe_onboarded) return NextResponse.json({ error: 'Seller Stripe account is still being verified' }, { status: 400 })

    const stripe = getStripe()
    const account = await stripe.accounts.retrieve(listing.profiles.stripe_account_id)
    if (!account.charges_enabled) {
      await supabase.from('profiles').update({ stripe_onboarded: false }).eq('id', listing.seller_id)
      return NextResponse.json({ error: 'Seller Stripe account is not ready for payments yet' }, { status: 400 })
    }

    const priceInCents = Math.round(Number(listing.price) * 100)
    const feeInCents = Math.round(calculatePlatformFee(Number(listing.price)) * 100)

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: listing.title, images: (listing.images || []).slice(0, 1) },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing_id}`,
      client_reference_id: listing_id,
      payment_intent_data: {
        application_fee_amount: feeInCents,
        transfer_data: { destination: listing.profiles.stripe_account_id },
      },
      metadata: { listing_id, buyer_id: user.id, seller_id: listing.seller_id },
    }, {
      idempotencyKey: `checkout:${listing_id}:${user.id}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Create checkout session error:', error)
    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 })
  }
}

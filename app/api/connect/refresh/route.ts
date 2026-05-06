import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL))

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_account_id) {
    return NextResponse.redirect(new URL('/dashboard/connect', process.env.NEXT_PUBLIC_APP_URL))
  }

  const accountLink = await stripe.accountLinks.create({
    account: profile.stripe_account_id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect?success=true`,
    type: 'account_onboarding',
  })

  return NextResponse.redirect(accountLink.url)
}

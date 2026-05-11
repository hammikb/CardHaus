import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

async function getAdminSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { resolution } = await request.json()

  const { data: order } = await supabase
    .from('orders')
    .select('stripe_payment_intent_id, total')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (resolution === 'refund' && order.stripe_payment_intent_id) {
    await getStripe().refunds.create({ payment_intent: order.stripe_payment_intent_id })
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', id)
  } else if (resolution === 'release') {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id)
  } else {
    return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

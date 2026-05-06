import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id, rating, body } = await request.json()

  if (!order_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'order_id and rating (1-5) required' }, { status: 400 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, status')
    .eq('id', order_id)
    .eq('buyer_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'delivered') return NextResponse.json({ error: 'Order must be delivered before reviewing' }, { status: 400 })

  const { data, error } = await supabase
    .from('reviews')
    .insert({ order_id, buyer_id: user.id, seller_id: order.seller_id, rating, body })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already reviewed this order' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

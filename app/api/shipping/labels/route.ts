import { createClient } from '@/lib/supabase/server'
import { createShipment } from '@/lib/easypost'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id, to_name, to_street, to_city, to_state, to_zip, from_name, from_street, from_city, from_state, from_zip, weight_oz } = await request.json()

  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id, status, easypost_shipment_id')
    .eq('id', order_id)
    .eq('seller_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.easypost_shipment_id) return NextResponse.json({ error: 'Label already generated' }, { status: 400 })

  const shipment = await createShipment({
    toName: to_name, toStreet: to_street, toCity: to_city, toState: to_state, toZip: to_zip,
    fromName: from_name, fromStreet: from_street, fromCity: from_city, fromState: from_state, fromZip: from_zip,
    weightOz: weight_oz ?? 1,
  })

  await supabase.from('orders').update({
    easypost_shipment_id: shipment.id,
    tracking_number: shipment.tracking_code,
    shipping_cost: shipment.charged_rate,
    status: 'shipped',
  }).eq('id', order_id)

  return NextResponse.json({ label_url: shipment.label_url, tracking_code: shipment.tracking_code, charged_rate: shipment.charged_rate })
}

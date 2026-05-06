import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await request.json()
  if (!amount || isNaN(amount)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, listings(seller_id)')
    .eq('id', id)
    .single()

  if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  if (new Date(auction.ends_at) <= new Date()) return NextResponse.json({ error: 'Auction ended' }, { status: 400 })
  if (auction.listings?.seller_id === user.id) return NextResponse.json({ error: 'Cannot bid on own auction' }, { status: 400 })

  const minBid = auction.current_bid ? auction.current_bid + 0.01 : auction.start_price
  if (amount < minBid) return NextResponse.json({ error: `Minimum bid is $${minBid.toFixed(2)}` }, { status: 400 })

  await supabase.from('bids').insert({ auction_id: id, bidder_id: user.id, amount })

  const { error } = await supabase
    .from('auctions')
    .update({ current_bid: amount, bid_count: auction.bid_count + 1, winner_id: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, current_bid: amount })
}

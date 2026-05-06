const fs = require('fs');
const path = require('path');

const files = {
  // Phase 2 API routes
  'app/api/auctions/route.ts': `import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('auctions')
    .select('*, listings(title, images, card_type, condition, seller_id, profiles(username))')
    .gt('ends_at', now)
    .order('ends_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, card_type, condition, grade, grade_company, images, start_price, ends_at } = await request.json()

  if (!title || !start_price || !ends_at || !card_type || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const endsDate = new Date(ends_at)
  if (endsDate <= new Date()) {
    return NextResponse.json({ error: 'End time must be in the future' }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({ seller_id: user.id, title, description, price: start_price, card_type, condition, grade, grade_company, images: images ?? [], is_auction: true })
    .select()
    .single()

  if (listingError) return NextResponse.json({ error: listingError.message }, { status: 500 })

  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .insert({ listing_id: listing.id, start_price, ends_at })
    .select()
    .single()

  if (auctionError) return NextResponse.json({ error: auctionError.message }, { status: 500 })
  return NextResponse.json(auction, { status: 201 })
}`,
  
  'app/api/auctions/[id]/bid/route.ts': `import { createClient } from '@/lib/supabase/server'
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
  if (amount < minBid) return NextResponse.json({ error: \`Minimum bid is \\\$\\\${minBid.toFixed(2)}\` }, { status: 400 })

  await supabase.from('bids').insert({ auction_id: id, bidder_id: user.id, amount })

  const { error } = await supabase
    .from('auctions')
    .update({ current_bid: amount, bid_count: auction.bid_count + 1, winner_id: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, current_bid: amount })
}`
};

Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Created: ${filePath}`);
});

console.log('All Phase 2+3 files created!');

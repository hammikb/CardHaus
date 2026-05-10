import { createClient } from '@/lib/supabase/server'
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

  const { title, description, card_type, condition, grade, grade_company, images, start_price, ends_at, card_variant_id } = await request.json()

  if (!title || !start_price || !ends_at || !card_type || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const endsDate = new Date(ends_at)
  if (endsDate <= new Date()) {
    return NextResponse.json({ error: 'End time must be in the future' }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      title,
      description,
      price: start_price,
      card_type,
      condition,
      grade,
      grade_company,
      images: images ?? [],
      is_auction: true,
      card_variant_id: card_variant_id ?? null,
    })
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
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })

  const cardType = searchParams.get('card_type')
  const condition = searchParams.get('condition')
  const productType = searchParams.get('product_type')
  const minPrice = searchParams.get('min_price')
  const maxPrice = searchParams.get('max_price')
  const q = searchParams.get('q')

  if (cardType) query = query.eq('card_type', cardType)
  if (condition) query = query.eq('condition', condition)
  if (productType) query = query.eq('product_type', productType)
  if (minPrice) query = query.gte('price', Number(minPrice))
  if (maxPrice) query = query.lte('price', Number(maxPrice))
  if (q) query = query.ilike('title', q)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, price, card_type, condition, grade, grade_company, images, product_type, sealed_type, quantity } = body

  if (!title || !price || !card_type || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      title,
      description,
      price,
      card_type,
      condition,
      grade: grade || null,
      grade_company: grade_company || null,
      images: images ?? [],
      product_type: product_type ?? 'single',
      sealed_type: sealed_type ?? null,
      quantity: quantity ?? 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('profiles').update({ role: 'seller' }).eq('id', user.id).eq('role', 'buyer')

  return NextResponse.json(data, { status: 201 })
}

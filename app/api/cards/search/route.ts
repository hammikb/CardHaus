import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cards')
      .select('id, external_id, name, image_url, card_variants(id, set_name, image_url, rarity, price)')
      .ilike('name', `%${query}%`)
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = (data || []).flatMap(card =>
      (card.card_variants || []).map(variant => ({
        id: variant.id,
        card_id: card.id,
        external_id: card.external_id,
        name: card.name,
        set: variant.set_name,
        image_url: variant.image_url || card.image_url,
        price: variant.price,
        rarity: variant.rarity,
      }))
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error('Card search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

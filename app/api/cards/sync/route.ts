import { createServiceClient } from '@/lib/supabase/server'
import { fetchAllPokemonCards } from '@/lib/pokemon-tcg-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting Pokemon card sync from Pokemon TCG API...')

    const body = await request.json().catch(() => ({}))
    const batchSize = Math.min(
      Number(body.batch_size ?? request.nextUrl.searchParams.get('batch_size') ?? 1000),
      1500
    )
    const currentPage = Math.max(
      Number(body.page ?? request.nextUrl.searchParams.get('page') ?? 1),
      1
    )

    console.log(`Syncing batch starting at page ${currentPage}...`)
    const cards = await fetchAllPokemonCards(batchSize, currentPage)

    if (cards.length === 0) {
      console.log(`Reached end of API (page ${currentPage}), stopping`)
      return NextResponse.json({
        success: true,
        count: 0,
        page: currentPage,
        has_more: false,
        synced_at: new Date().toISOString(),
      })
    }

    const supabase = await createServiceClient()
    const updatedAt = new Date().toISOString()

    const cardsToInsert = cards.map(c => ({
      external_id: c.tcgPlayerId,
      name: c.name,
      number: c.number,
      game: c.game,
      image_url: c.imageUrl,
      updated_at: updatedAt,
    }))

    const { error: cardError } = await supabase
      .from('cards')
      .upsert(cardsToInsert, { onConflict: 'external_id' })

    if (cardError) {
      console.error(`Card insert error at page ${currentPage}: ${JSON.stringify(cardError)}`)
      return NextResponse.json({ error: cardError.message }, { status: 500 })
    }

    const externalIds = cardsToInsert.map(c => c.external_id)
    const { data: allCards, error: queryError } = await supabase
      .from('cards')
      .select('id, external_id')
      .in('external_id', externalIds)

    if (queryError) {
      console.error(`Card query error at page ${currentPage}: ${JSON.stringify(queryError)}`)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    const cardIdMap = new Map((allCards || []).map(c => [c.external_id, c.id]))
    const variantsToInsert = cards.map(c => ({
      card_id: cardIdMap.get(c.tcgPlayerId),
      set_id: c.setId,
      set_name: c.set,
      language: 'English',
      rarity: c.rarity,
      image_url: c.imageUrl,
      price: c.price,
      updated_at: updatedAt,
    })).filter(c => c.card_id)

    const { error: variantError } = await supabase
      .from('card_variants')
      .upsert(variantsToInsert, { onConflict: 'card_id,set_id,language' })

    if (variantError) {
      console.error(`Variant insert error at page ${currentPage}: ${JSON.stringify(variantError)}`)
      return NextResponse.json({ error: variantError.message }, { status: 500 })
    }

    const nextPage = currentPage + Math.ceil(batchSize / 250)
    const hasMore = cards.length === batchSize
    console.log(`Batch synced ${cards.length} cards`)

    return NextResponse.json({
      success: true,
      count: cards.length,
      page: currentPage,
      next_page: hasMore ? nextPage : null,
      has_more: hasMore,
      synced_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

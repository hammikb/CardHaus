import { createServiceClient } from '@/lib/supabase/server'
import { fetchAllPokemonCards } from '@/lib/pokemon-tcg-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting Pokemon card sync from Pokemon TCG API...')

    // Batch syncing to stay under 60s Vercel timeout
    // Each batch: ~1500 cards ≈ 50s
    const batchSize = 1500
    let totalSynced = 0
    let currentPage = 1

    // Keep syncing batches until API returns no cards
    while (true) {
      console.log(`Syncing batch starting at page ${currentPage}...`)
      const cards = await fetchAllPokemonCards(batchSize, currentPage)

      if (cards.length === 0) {
        console.log(`Reached end of API (page ${currentPage}), stopping`)
        break
      }

      const supabase = await createServiceClient()

      // Insert/update cards
      const cardsToInsert = cards.map(c => ({
        tcgcsv_id: c.tcgPlayerId_numeric,
        name: c.name,
        game: c.game,
        image_url: c.imageUrl,
      }))

      const { error: cardError } = await supabase
        .from('cards')
        .upsert(cardsToInsert, { onConflict: 'tcgcsv_id' })

      if (cardError) {
        console.error(`Card insert error at page ${currentPage}: ${JSON.stringify(cardError)}`)
        return NextResponse.json({ error: cardError.message }, { status: 500 })
      }

      // Query cards table to get all IDs (upsert select doesn't return updated rows)
      const tcgcsv_ids = cardsToInsert.map(c => c.tcgcsv_id)
      const { data: allCards, error: queryError } = await supabase
        .from('cards')
        .select('id, tcgcsv_id')
        .in('tcgcsv_id', tcgcsv_ids)

      if (queryError) {
        console.error(`Card query error at page ${currentPage}: ${JSON.stringify(queryError)}`)
        return NextResponse.json({ error: queryError.message }, { status: 500 })
      }

      // Map cards to variants for insertion
      const cardIdMap = new Map(allCards.map((c: any) => [c.tcgcsv_id, c.id]))
      const variantsToInsert = cards.map(c => ({
        card_id: cardIdMap.get(c.tcgPlayerId_numeric),
        set_id: c.setId,
        set_name: c.set,
        language: 'English',
        rarity: c.rarity,
        image_url: c.imageUrl,
      }))

      // Insert variants (ignore conflicts if already exists)
      const { error: variantError } = await supabase
        .from('card_variants')
        .insert(variantsToInsert)

      // Variants might already exist - that's OK, just log it
      if (variantError && !variantError.message.includes('duplicate')) {
        console.error(`Variant insert error at page ${currentPage}: ${JSON.stringify(variantError)}`)
        return NextResponse.json({ error: variantError.message }, { status: 500 })
      }

      totalSynced += cards.length
      console.log(`Batch synced ${cards.length} cards (total: ${totalSynced})`)

      // Move to next batch starting page
      currentPage += Math.ceil(batchSize / 250)
    }

    console.log(`Successfully synced ${totalSynced} cards total`)
    return NextResponse.json({
      success: true,
      count: totalSynced,
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

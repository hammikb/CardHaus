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
    const batches = [1, 7, 13] // page numbers for batches (pages 1-6, 7-12, 13+)

    let totalSynced = 0

    for (const startPage of batches) {
      console.log(`Syncing batch starting at page ${startPage}...`)
      const cards = await fetchAllPokemonCards(batchSize, startPage)

      if (cards.length === 0) {
        console.log(`Batch from page ${startPage} returned no cards, stopping`)
        break
      }

      const supabase = await createServiceClient()
      const { error } = await supabase.from('cards').upsert(
        cards.map(c => ({
          tcg_player_id: c.tcgPlayerId,
          name: c.name,
          set: c.set,
          price: c.price,
          rarity: c.rarity,
          image_url: c.imageUrl,
          condition: c.condition,
          game: c.game,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: 'tcg_player_id' }
      )

      if (error) {
        console.error(`Batch error at page ${startPage}:`, error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      totalSynced += cards.length
      console.log(`Batch synced ${cards.length} cards (total: ${totalSynced})`)
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

import { createClient } from '@/lib/supabase/server'
import { fetchAllPokemonCards } from '@/lib/pokemon-tcg-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting Pokemon card sync from Pokemon TCG API...')

    // Fetch from Pokemon TCG API (1000 limit for Vercel timeout)
    const cards = await fetchAllPokemonCards(1000)
    console.log(`Fetched ${cards.length} Pokemon cards from Pokemon TCG API`)

    if (cards.length === 0) {
      return NextResponse.json({ error: 'No cards fetched from Pokemon TCG API' }, { status: 400 })
    }

    const supabase = await createClient()

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
      console.error('Supabase upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Successfully synced ${cards.length} cards`)
    return NextResponse.json({
      success: true,
      count: cards.length,
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

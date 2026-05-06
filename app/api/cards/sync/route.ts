import { createClient } from '@/lib/supabase/server'
import { fetchAllTCGCards } from '@/lib/tcgcsv-api'
import { fetchJustTCGPokemonCards } from '@/lib/justtcg-api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting card sync from all TCG sources...')

    // Primary source: TCGCSV (all TCGs)
    let cards = await fetchAllTCGCards()
    console.log(`Fetched ${cards.length} cards from TCGCSV across all TCGs`)

    // Fallback: JustTCG for Pokémon if TCGCSV returns few
    if (cards.filter(c => c.game === 'pokemon').length < 500) {
      console.log('TCGCSV Pokémon returned few cards, fetching from JustTCG...')
      const justTcgCards = await fetchJustTCGPokemonCards(200)

      // Merge: add JustTCG cards not in TCGCSV
      const tcgcsNameSet = new Set(cards.map(c => c.name.toLowerCase()))
      const newCards = justTcgCards.filter(c => !tcgcsNameSet.has(c.name.toLowerCase()))
      cards = cards.concat(newCards)
      console.log(`Added ${newCards.length} cards from JustTCG, total: ${cards.length}`)
    }

    if (cards.length === 0) {
      return NextResponse.json({ error: 'No cards fetched from any source' }, { status: 400 })
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

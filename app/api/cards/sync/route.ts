import { createServiceClient } from '@/lib/supabase/server'
import { fetchAllPokemonCards } from '@/lib/pokemon-tcg-api'
import { NextRequest, NextResponse } from 'next/server'

const POKEMON_SYNC_KEY = 'pokemon_cards'
const POKEMON_API_PAGE_SIZE = 250
const DEFAULT_BATCH_SIZE = 1000
const MAX_BATCH_SIZE = 1500

type SyncState = {
  next_page: number
  batch_size: number
  total_synced: number
  has_more: boolean
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function normalizeBatchSize(value: unknown, fallback: number) {
  const parsed = parsePositiveInteger(value, fallback)
  const capped = Math.min(parsed, MAX_BATCH_SIZE)
  return Math.max(POKEMON_API_PAGE_SIZE, Math.ceil(capped / POKEMON_API_PAGE_SIZE) * POKEMON_API_PAGE_SIZE)
}

async function updatePokemonSyncState(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  values: Record<string, unknown>
) {
  const { error } = await supabase
    .from('pokemon_sync_state')
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq('sync_key', POKEMON_SYNC_KEY)

  if (error) {
    console.error(`Pokemon sync state update error: ${JSON.stringify(error)}`)
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase: Awaited<ReturnType<typeof createServiceClient>> | null = null
  let currentPage = 1

  try {
    console.log('Starting Pokemon card sync from Pokemon TCG API...')

    const body = await request.json().catch(() => ({}))
    const mode = body.mode ?? request.nextUrl.searchParams.get('mode')
    const reset = body.reset === true || request.nextUrl.searchParams.get('reset') === 'true'
    const autoMode = mode === 'auto'

    supabase = await createServiceClient()

    let batchSize = normalizeBatchSize(
      body.batch_size ?? request.nextUrl.searchParams.get('batch_size'),
      DEFAULT_BATCH_SIZE
    )
    let previousTotalSynced = 0

    if (autoMode) {
      const { data: state, error: stateError } = await supabase
        .from('pokemon_sync_state')
        .select('next_page, batch_size, total_synced, has_more')
        .eq('sync_key', POKEMON_SYNC_KEY)
        .maybeSingle<SyncState>()

      if (stateError) {
        console.error(`Pokemon sync state query error: ${JSON.stringify(stateError)}`)
        return NextResponse.json({ error: stateError.message }, { status: 500 })
      }

      currentPage = reset ? 1 : state?.next_page ?? 1
      previousTotalSynced = reset ? 0 : state?.total_synced ?? 0
      batchSize = normalizeBatchSize(
        body.batch_size ?? request.nextUrl.searchParams.get('batch_size') ?? state?.batch_size,
        POKEMON_API_PAGE_SIZE
      )

      if (state && !state.has_more && !reset) {
        return NextResponse.json({
          success: true,
          count: 0,
          page: state.next_page,
          next_page: null,
          has_more: false,
          message: 'Pokemon catalog sync is already complete. Pass reset=true to start over.',
          synced_at: new Date().toISOString(),
        })
      }

      await supabase
        .from('pokemon_sync_state')
        .upsert({
          sync_key: POKEMON_SYNC_KEY,
          next_page: currentPage,
          batch_size: batchSize,
          total_synced: previousTotalSynced,
          last_status: 'running',
          last_error: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'sync_key' })
    } else {
      currentPage = parsePositiveInteger(body.page ?? request.nextUrl.searchParams.get('page'), 1)
    }

    console.log(`Syncing batch starting at page ${currentPage}...`)
    const cards = await fetchAllPokemonCards(batchSize, currentPage)

    if (cards.length === 0) {
      console.log(`Reached end of API (page ${currentPage}), stopping`)
      if (autoMode) {
        await updatePokemonSyncState(supabase, {
          next_page: currentPage,
          batch_size: batchSize,
          last_count: 0,
          has_more: false,
          last_status: 'completed',
          last_error: null,
          last_synced_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        success: true,
        count: 0,
        page: currentPage,
        has_more: false,
        synced_at: new Date().toISOString(),
      })
    }

    const updatedAt = new Date().toISOString()

    const cardsToInsert = cards.map(c => ({
      tcgcsv_id: c.tcgPlayerId,
      name: c.name,
      number: c.number,
      game: c.game,
      image_url: c.imageUrl,
      updated_at: updatedAt,
    }))

    const { error: cardError } = await supabase
      .from('cards')
      .upsert(cardsToInsert, { onConflict: 'tcgcsv_id' })

    if (cardError) {
      console.error(`Card insert error at page ${currentPage}: ${JSON.stringify(cardError)}`)
      return NextResponse.json({ error: cardError.message }, { status: 500 })
    }

    const tcgcsv_ids = cardsToInsert.map(c => c.tcgcsv_id)
    const { data: allCards, error: queryError } = await supabase
      .from('cards')
      .select('id, tcgcsv_id')
      .in('tcgcsv_id', tcgcsv_ids)

    if (queryError) {
      console.error(`Card query error at page ${currentPage}: ${JSON.stringify(queryError)}`)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    const cardIdMap = new Map((allCards || []).map(c => [c.tcgcsv_id, c.id]))
    const variantsToInsert = cards.map(c => ({
      card_id: cardIdMap.get(c.tcgPlayerId),
      set_id: c.setId,
      set_name: c.set,
      language: 'English',
      edition: null,
      rarity: c.rarity,
      image_url: c.imageUrl,
      updated_at: updatedAt,
    })).filter(c => c.card_id)

    const { error: variantError } = await supabase
      .from('card_variants')
      .upsert(variantsToInsert, { onConflict: 'card_id,set_id,language,edition' })

    if (variantError) {
      console.error(`Variant insert error at page ${currentPage}: ${JSON.stringify(variantError)}`)
      return NextResponse.json({ error: variantError.message }, { status: 500 })
    }

    const nextPage = currentPage + Math.ceil(batchSize / 250)
    const hasMore = cards.length === batchSize
    console.log(`Batch synced ${cards.length} cards`)

    if (autoMode) {
      await updatePokemonSyncState(supabase, {
        next_page: hasMore ? nextPage : currentPage,
        batch_size: batchSize,
        total_synced: previousTotalSynced + cards.length,
        last_count: cards.length,
        has_more: hasMore,
        last_status: hasMore ? 'idle' : 'completed',
        last_error: null,
        last_synced_at: updatedAt,
        completed_at: hasMore ? null : updatedAt,
      })
    }

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
    if (supabase) {
      await updatePokemonSyncState(supabase, {
        next_page: currentPage,
        last_status: 'error',
        last_error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

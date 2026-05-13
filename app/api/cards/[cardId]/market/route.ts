import { createServiceClient } from '@/lib/supabase/server'
import {
  buildMarketViewModel,
  fetchLiveMarketQuotes,
  type MarketSource,
  type MarketSourceSnapshot,
} from '@/lib/market-data'
import { NextRequest, NextResponse } from 'next/server'

type CardRow = {
  id: string
  name: string
  game: string
}

type VariantRow = {
  id: string
  set_name: string
}

type SnapshotRow = {
  source: MarketSource
  label: string
  price: number
  url: string | null
  captured_at: string
}

function toLatestSnapshots(rows: SnapshotRow[]): MarketSourceSnapshot[] {
  const latestBySource = new Map<MarketSource, MarketSourceSnapshot>()

  for (const row of rows) {
    if (latestBySource.has(row.source)) continue

    latestBySource.set(row.source, {
      source: row.source,
      label: row.label,
      price: Number(row.price),
      url: row.url,
      capturedAt: row.captured_at,
    })
  }

  return Array.from(latestBySource.values())
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    const { cardId } = await params
    const variantId = request.nextUrl.searchParams.get('variant_id')
    const supabase = await createServiceClient()

    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, name, game')
      .eq('id', cardId)
      .maybeSingle<CardRow>()

    if (cardError || !card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    let variant: VariantRow | null = null

    if (variantId) {
      const { data: variantData } = await supabase
        .from('card_variants')
        .select('id, set_name')
        .eq('id', variantId)
        .maybeSingle<VariantRow>()

      variant = variantData ?? null
    }

    const liveQuotes = await fetchLiveMarketQuotes({
      name: card.name,
      setName: variant?.set_name,
      game: card.game,
    })

    if (liveQuotes.length > 0) {
      await supabase.from('market_snapshots').insert(
        liveQuotes.map((quote) => ({
          card_id: card.id,
          card_variant_id: variant?.id ?? null,
          source: quote.source,
          label: quote.label,
          price: quote.price,
          url: quote.url,
          captured_at: quote.updatedAt,
        })),
      )
    }

    let snapshotQuery = supabase
      .from('market_snapshots')
      .select('source, label, price, url, captured_at')
      .eq('card_id', card.id)
      .order('captured_at', { ascending: false })
      .limit(36)

    if (variant?.id) {
      snapshotQuery = snapshotQuery.eq('card_variant_id', variant.id)
    }

    const { data: snapshotRows } = await snapshotQuery

    const snapshots = toLatestSnapshots((snapshotRows ?? []) as SnapshotRow[])
    const market = buildMarketViewModel(liveQuotes, snapshots)

    return NextResponse.json({
      card,
      variant,
      quotes: market.quotes,
      summary: market.summary,
      history: (snapshotRows ?? []).map((row: SnapshotRow) => ({
        source: row.source,
        price: Number(row.price),
        captured_at: row.captured_at,
      })),
    })
  } catch (error) {
    console.error('Card market fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

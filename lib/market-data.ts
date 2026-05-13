import { searchJustTCGCards } from './justtcg-api'
import { searchPokemonCards } from './pokemon-tcg-api'
import { searchTCGCSVCards } from './tcgcsv-api'

export {
  buildMarketViewModel,
  summarizeMarketPrices,
  type MarketDisplayQuote,
  type MarketPriceSummary,
  type MarketSource,
  type MarketSourceQuote,
  type MarketSourceSnapshot,
  type MarketViewModel,
} from './market-data-core'
import type { MarketSourceQuote } from './market-data-core'

export type CardMarketLookupInput = {
  name: string
  setName?: string | null
  game?: string | null
}

function normalizeSetName(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function pickBestPrice<T extends { price: number | null | undefined; set?: string | null }>(
  results: T[],
  setName?: string | null,
) {
  const exactSet = normalizeSetName(setName)

  const priced = results.filter((result) => typeof result.price === 'number')
  if (priced.length === 0) return null

  if (!exactSet) return priced[0]

  return (
    priced.find((result) => normalizeSetName(result.set) === exactSet) ??
    priced.find((result) => normalizeSetName(result.set).includes(exactSet)) ??
    priced[0]
  )
}

export async function fetchLiveMarketQuotes({
  name,
  setName,
  game = 'pokemon',
}: CardMarketLookupInput): Promise<MarketSourceQuote[]> {
  if (!name.trim()) return []
  const normalizedGame = game || 'pokemon'

  const settled = await Promise.allSettled([
    searchPokemonCards(name),
    searchJustTCGCards(name, normalizedGame),
    searchTCGCSVCards(name),
  ])

  const quotes: MarketSourceQuote[] = []
  const updatedAt = new Date().toISOString()

  const pokemonResults = settled[0].status === 'fulfilled' ? settled[0].value : []
  const bestPokemon = pickBestPrice(pokemonResults, setName)
  if (bestPokemon?.price) {
    quotes.push({
      source: 'cardmarket',
      label: 'Cardmarket Trend',
      price: bestPokemon.price,
      url: `https://www.pokemontcg.io/cards/${bestPokemon.tcgPlayerId}`,
      updatedAt,
    })
  }

  const justTcgResults = settled[1].status === 'fulfilled' ? settled[1].value : []
  const bestJustTcg = pickBestPrice(justTcgResults, setName)
  if (bestJustTcg?.price) {
    quotes.push({
      source: 'justtcg',
      label: 'JustTCG Market',
      price: bestJustTcg.price,
      url: null,
      updatedAt,
    })
  }

  const tcgcsvResults = settled[2].status === 'fulfilled' ? settled[2].value : []
  const bestTcgcsv = pickBestPrice(tcgcsvResults, setName)
  if (bestTcgcsv?.price) {
    quotes.push({
      source: 'tcgplayer',
      label: 'TCGplayer Market',
      price: bestTcgcsv.price,
      url: null,
      updatedAt,
    })
  }

  return quotes
}

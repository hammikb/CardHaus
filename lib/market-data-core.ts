export type MarketSource = 'tcgplayer' | 'cardmarket' | 'justtcg' | 'ebay'

export type MarketSourceQuote = {
  source: MarketSource
  label: string
  price: number
  url: string | null
  updatedAt: string
}

export type MarketSourceSnapshot = {
  source: MarketSource
  label: string
  price: number
  url: string | null
  capturedAt: string
}

export type MarketDisplayQuote = {
  source: MarketSource
  label: string
  price: number
  url: string | null
  updatedAt: string
  stale: boolean
}

export type MarketPriceSummary = {
  lowestPrice: number | null
  highestPrice: number | null
  averagePrice: number | null
}

export type MarketViewModel = {
  quotes: MarketDisplayQuote[]
  summary: MarketPriceSummary
}

export function summarizeMarketPrices(quotes: Array<{ price: number }>): MarketPriceSummary {
  if (quotes.length === 0) {
    return {
      lowestPrice: null,
      highestPrice: null,
      averagePrice: null,
    }
  }

  const prices = quotes.map((quote) => quote.price)
  const total = prices.reduce((sum, price) => sum + price, 0)

  return {
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    averagePrice: Math.round((total / prices.length) * 100) / 100,
  }
}

export function buildMarketViewModel(
  liveQuotes: MarketSourceQuote[],
  snapshots: MarketSourceSnapshot[],
): MarketViewModel {
  const seen = new Set<MarketSource>()
  const quotes: MarketDisplayQuote[] = []

  for (const quote of liveQuotes) {
    seen.add(quote.source)
    quotes.push({
      ...quote,
      stale: false,
    })
  }

  for (const snapshot of snapshots) {
    if (seen.has(snapshot.source)) continue

    quotes.push({
      source: snapshot.source,
      label: snapshot.label,
      price: snapshot.price,
      url: snapshot.url,
      updatedAt: snapshot.capturedAt,
      stale: true,
    })
  }

  quotes.sort((left, right) => left.price - right.price)

  return {
    quotes,
    summary: summarizeMarketPrices(quotes),
  }
}

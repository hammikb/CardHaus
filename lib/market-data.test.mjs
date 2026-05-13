import test from 'node:test'
import assert from 'node:assert/strict'

import { buildMarketViewModel, summarizeMarketPrices } from './market-data-core.ts'

test('prefers live quotes and falls back to snapshot quotes with stale status', () => {
  const liveQuotes = [
    {
      source: 'tcgplayer',
      label: 'TCGplayer Market',
      price: 21.45,
      url: 'https://example.com/tcgplayer',
      updatedAt: '2026-05-13T12:00:00.000Z',
    },
  ]

  const snapshots = [
    {
      source: 'ebay',
      label: 'eBay Recent Sold',
      price: 22.1,
      url: 'https://example.com/ebay',
      capturedAt: '2026-05-12T12:00:00.000Z',
    },
  ]

  const viewModel = buildMarketViewModel(liveQuotes, snapshots)

  assert.equal(viewModel.quotes.length, 2)
  assert.deepEqual(
    viewModel.quotes.map((quote) => ({
      source: quote.source,
      stale: quote.stale,
      price: quote.price,
    })),
    [
      { source: 'tcgplayer', stale: false, price: 21.45 },
      { source: 'ebay', stale: true, price: 22.1 },
    ],
  )
})

test('summarizes lowest and highest available market prices', () => {
  const summary = summarizeMarketPrices([
    {
      source: 'tcgplayer',
      label: 'TCGplayer Market',
      price: 20,
      url: 'https://example.com/tcgplayer',
      updatedAt: '2026-05-13T12:00:00.000Z',
    },
    {
      source: 'cardmarket',
      label: 'Cardmarket Trend',
      price: 24.5,
      url: 'https://example.com/cardmarket',
      updatedAt: '2026-05-13T12:10:00.000Z',
    },
  ])

  assert.equal(summary.lowestPrice, 20)
  assert.equal(summary.highestPrice, 24.5)
  assert.equal(summary.averagePrice, 22.25)
})

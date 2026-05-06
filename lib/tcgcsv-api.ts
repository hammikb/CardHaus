export interface CardData {
  tcgPlayerId: string
  name: string
  set: string
  price: number | null
  rarity: string | null
  imageUrl: string | null
  condition: string
  game: string
}

interface TCGCSVProduct {
  productId: number
  name: string
  categoryId: number
  groupId: number
  url: string
  modifiedOn: string
}

interface TCGCSVPrice {
  productId: number
  lowPrice: number | null
  midPrice: number | null
  highPrice: number | null
  marketPrice: number | null
  directLowPrice: number | null
  directMidPrice: number | null
  directHighPrice: number | null
  directMarketPrice: number | null
}

const TCGCSV_API = 'https://tcgcsv.com/tcgplayer'

// TCG category IDs from TCGCSV
const TCG_CATEGORIES = {
  mtg: 1,
  pokemon: 3,
  yugioh: 2,
  sports: 4,
  digimon: 5,
  lorcana: 6,
  one_piece: 7,
} as const

// GroupIds per category (discovered via TCGCSV API)
// To find more groupIds for a category, visit: https://tcgcsv.com/tcgplayer/{categoryId}/{groupId}/products
const TCG_GROUP_IDS: Record<number, number[]> = {
  1: [], // MTG - add groupIds as discovered
  2: [], // Yu-Gi-Oh - add groupIds as discovered
  3: [3170], // Pokemon - groupId 3170 confirmed
  4: [], // Sports - add groupIds as discovered
  5: [], // Digimon - add groupIds as discovered
  6: [], // Lorcana - add groupIds as discovered
  7: [], // One Piece - add groupIds as discovered
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchCardsByGroup(categoryId: number, groupId: number, gameName: string): Promise<CardData[]> {
  try {
    console.log(`Fetching ${gameName} cards (category ${categoryId}, group ${groupId})...`)

    const productsUrl = `${TCGCSV_API}/${categoryId}/${groupId}/products`
    const productsResponse = await fetch(productsUrl, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!productsResponse.ok) {
      console.warn(`Failed to fetch products: ${productsResponse.status}`)
      return []
    }

    const products: TCGCSVProduct[] = await productsResponse.json()
    if (!Array.isArray(products) || products.length === 0) {
      console.warn(`No ${gameName} products in group ${groupId}`)
      return []
    }

    console.log(`Fetched ${products.length} ${gameName} products`)

    // 100ms delay per docs
    await sleep(100)

    // Fetch pricing for all products
    const pricesUrl = `${TCGCSV_API}/${categoryId}/${groupId}/prices`
    const pricesResponse = await fetch(pricesUrl, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!pricesResponse.ok) {
      console.warn(`Failed to fetch prices: ${pricesResponse.status}`)
      return []
    }

    const prices: TCGCSVPrice[] = await pricesResponse.json()
    const priceMap = new Map(prices.map(p => [p.productId, p]))

    const cards: CardData[] = products.map(product => {
      const pricing = priceMap.get(product.productId)
      const price = pricing?.marketPrice || pricing?.midPrice || null

      return {
        tcgPlayerId: product.productId.toString(),
        name: product.name,
        set: extractSetFromName(product.name),
        price,
        rarity: null,
        imageUrl: `https://tcgcsv.com/image/product/${product.productId}`,
        condition: 'NM',
        game: gameName,
      }
    })

    console.log(`Transformed ${cards.length} ${gameName} cards with pricing data`)
    return cards
  } catch (error) {
    console.error(`Error fetching ${gameName} cards:`, error)
    return []
  }
}

export async function fetchAllTCGCards(): Promise<CardData[]> {
  try {
    console.log('Fetching cards from all TCG categories...')
    const allCards: CardData[] = []

    for (const [game, categoryId] of Object.entries(TCG_CATEGORIES)) {
      const groupIds = TCG_GROUP_IDS[categoryId as number]

      if (groupIds.length === 0) {
        console.warn(`No groupIds configured for ${game} (category ${categoryId}). Skipping.`)
        continue
      }

      for (const groupId of groupIds) {
        const cards = await fetchCardsByGroup(categoryId as number, groupId, game)
        allCards.push(...cards)
      }
    }

    console.log(`Total cards fetched: ${allCards.length}`)
    return allCards
  } catch (error) {
    console.error('Error fetching all TCG cards:', error)
    return []
  }
}

export async function fetchTCGCSVPokemonCards(): Promise<CardData[]> {
  const pokemonGroupIds = TCG_GROUP_IDS[TCG_CATEGORIES.pokemon]
  const allCards: CardData[] = []

  for (const groupId of pokemonGroupIds) {
    const cards = await fetchCardsByGroup(TCG_CATEGORIES.pokemon, groupId, 'pokemon')
    allCards.push(...cards)
  }

  return allCards
}

function extractSetFromName(productName: string): string {
  // Pokémon cards typically have format: "Card Name - Set Name" or "Card Name (Set Abbreviation)"
  // TCGCSV names vary, so we'll extract intelligently
  const match = productName.match(/[-–]\s*(.+?)(?:\s*\(|$)/) ||
                productName.match(/\(([^)]+)\)/)
  return match ? match[1].trim() : 'Unknown'
}

export async function searchTCGCSVCards(query: string, categoryId?: number): Promise<CardData[]> {
  try {
    if (query.length < 2) return []

    // If specific category provided, search that; otherwise search Pokémon by default
    const catId = categoryId || TCG_CATEGORIES.pokemon
    const gameName = Object.entries(TCG_CATEGORIES).find(([_, id]) => id === catId)?.[0] || 'pokemon'
    const groupIds = TCG_GROUP_IDS[catId]

    if (groupIds.length === 0) {
      console.warn(`No groupIds configured for search in category ${catId}`)
      return []
    }

    const results: CardData[] = []

    // Search across all groups for this category
    for (const groupId of groupIds) {
      const url = `${TCGCSV_API}/${catId}/${groupId}/products?q=${encodeURIComponent(query)}`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CardHaus/1.0' },
      })

      if (!response.ok) {
        console.warn(`Search failed in group ${groupId}: ${response.status}`)
        continue
      }

      const products: TCGCSVProduct[] = await response.json()

      results.push(...products.map(product => ({
        tcgPlayerId: product.productId.toString(),
        name: product.name,
        set: extractSetFromName(product.name),
        price: null,
        rarity: null,
        imageUrl: `https://tcgcsv.com/image/product/${product.productId}`,
        condition: 'NM',
        game: gameName,
      })))

      await sleep(100)
    }

    return results
  } catch (error) {
    console.error('TCGCSV search error:', error)
    return []
  }
}

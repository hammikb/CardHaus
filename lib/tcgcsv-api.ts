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

const TCGCSV_API = 'https://tcgcsv.com/api'

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

async function fetchCardsByCategory(categoryId: number, gameName: string): Promise<CardData[]> {
  try {
    console.log(`Fetching ${gameName} cards from TCGCSV (category ${categoryId})...`)

    const productsUrl = `${TCGCSV_API}/tcgplayer/products?categoryId=${categoryId}`
    const productsResponse = await fetch(productsUrl, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!productsResponse.ok) {
      console.warn(`Failed to fetch ${gameName} products: ${productsResponse.status}`)
      return []
    }

    const products: TCGCSVProduct[] = await productsResponse.json()
    if (!Array.isArray(products) || products.length === 0) {
      console.warn(`No ${gameName} products returned from TCGCSV`)
      return []
    }

    console.log(`Fetched ${products.length} ${gameName} products from TCGCSV`)

    // Fetch pricing for all products
    const pricesUrl = `${TCGCSV_API}/tcgplayer/prices`
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

    // Fetch from primary categories
    for (const [game, categoryId] of Object.entries(TCG_CATEGORIES)) {
      const cards = await fetchCardsByCategory(categoryId, game)
      allCards.push(...cards)
    }

    console.log(`Total cards fetched: ${allCards.length}`)
    return allCards
  } catch (error) {
    console.error('Error fetching all TCG cards:', error)
    return []
  }
}

export async function fetchTCGCSVPokemonCards(): Promise<CardData[]> {
  return fetchCardsByCategory(TCG_CATEGORIES.pokemon, 'pokemon')
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

    const url = `${TCGCSV_API}/tcgplayer/products?q=${encodeURIComponent(query)}&categoryId=${catId}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!response.ok) {
      console.warn(`Search failed: ${response.status}`)
      return []
    }

    const products: TCGCSVProduct[] = await response.json()

    return products.map(product => ({
      tcgPlayerId: product.productId.toString(),
      name: product.name,
      set: extractSetFromName(product.name),
      price: null,
      rarity: null,
      imageUrl: `https://tcgcsv.com/image/product/${product.productId}`,
      condition: 'NM',
      game: gameName,
    }))
  } catch (error) {
    console.error('TCGCSV search error:', error)
    return []
  }
}

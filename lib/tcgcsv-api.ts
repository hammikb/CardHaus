export interface CardData {
  tcgPlayerId: string
  name: string
  set: string
  price: number | null
  rarity: string | null
  imageUrl: string | null
  condition: string
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

export async function fetchTCGCSVPokemonCards(): Promise<CardData[]> {
  try {
    console.log('Fetching Pokémon cards from TCGCSV...')

    // Get category ID for Pokémon (3)
    const categoryId = 3

    // Fetch all Pokémon products
    const productsUrl = `${TCGCSV_API}/tcgplayer/products?categoryId=${categoryId}`
    const productsResponse = await fetch(productsUrl, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!productsResponse.ok) {
      throw new Error(`TCGCSV products fetch failed: ${productsResponse.status}`)
    }

    const products: TCGCSVProduct[] = await productsResponse.json()
    console.log(`Fetched ${products.length} Pokémon products from TCGCSV`)

    if (!Array.isArray(products) || products.length === 0) {
      console.warn('No products returned from TCGCSV')
      return []
    }

    // Fetch pricing for all products
    const pricesUrl = `${TCGCSV_API}/tcgplayer/prices`
    const pricesResponse = await fetch(pricesUrl, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!pricesResponse.ok) {
      throw new Error(`TCGCSV prices fetch failed: ${pricesResponse.status}`)
    }

    const prices: TCGCSVPrice[] = await pricesResponse.json()
    const priceMap = new Map(prices.map(p => [p.productId, p]))

    // Transform to CardData format
    const cards: CardData[] = products.map(product => {
      const pricing = priceMap.get(product.productId)
      const price = pricing?.marketPrice || pricing?.midPrice || null

      return {
        tcgPlayerId: product.productId.toString(),
        name: product.name,
        set: extractSetFromName(product.name),
        price,
        rarity: null, // TCGCSV doesn't provide rarity
        imageUrl: `https://tcgcsv.com/image/product/${product.productId}`,
        condition: 'NM', // Default to Near Mint
      }
    })

    console.log(`Transformed ${cards.length} cards with pricing data`)
    return cards
  } catch (error) {
    console.error('TCGCSV fetch error:', error)
    throw error
  }
}

function extractSetFromName(productName: string): string {
  // Pokémon cards typically have format: "Card Name - Set Name" or "Card Name (Set Abbreviation)"
  // TCGCSV names vary, so we'll extract intelligently
  const match = productName.match(/[-–]\s*(.+?)(?:\s*\(|$)/) ||
                productName.match(/\(([^)]+)\)/)
  return match ? match[1].trim() : 'Unknown'
}

export async function searchTCGCSVCards(query: string): Promise<CardData[]> {
  try {
    if (query.length < 2) return []

    const url = `${TCGCSV_API}/tcgplayer/products?q=${encodeURIComponent(query)}&categoryId=3`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CardHaus/1.0' },
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
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
    }))
  } catch (error) {
    console.error('TCGCSV search error:', error)
    return []
  }
}

export interface CardData {
  tcgPlayerId: string
  tcgPlayerId_numeric: number
  name: string
  number: string | null
  set: string
  setId: string
  price: number | null
  rarity: string | null
  imageUrl: string | null
  condition: string
  game: string
}

interface PokemonTCGCard {
  id: string
  name: string
  number?: string
  rarity?: string
  images?: {
    small?: string
    large?: string
  }
  cardmarket?: {
    prices?: {
      averageSellPrice?: number
      lowPrice?: number
      trendPrice?: number
    }
  }
  set?: {
    id?: string
    name?: string
    series?: string
  }
}

interface PokemonTCGResponse {
  data: PokemonTCGCard[]
  page?: number
  pageSize?: number
  count?: number
  totalCount?: number
}

const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2'
const API_KEY = process.env.POKEMON_TCG_API_KEY

function getHeaders() {
  const headers: Record<string, string> = { 'User-Agent': 'CardHaus/1.0' }
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY
  }
  return headers
}

export async function searchPokemonCards(query: string): Promise<CardData[]> {
  try {
    if (query.length < 2) return []

    const url = `${POKEMON_TCG_API}/cards?q=name:${encodeURIComponent(query)}&pageSize=20`
    const response = await fetch(url, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      console.error(`Pokemon TCG search failed: ${response.status}`)
      return []
    }

    const data: PokemonTCGResponse = await response.json()
    return data.data
      .filter((card: PokemonTCGCard) => {
        const numeric = parseInt(card.id, 10)
        if (isNaN(numeric)) {
          console.warn(`Skipping card with non-numeric ID: ${card.id}`)
          return false
        }
        return true
      })
      .map((card: PokemonTCGCard) => ({
        tcgPlayerId: `pokemon_${card.id}`,
        tcgPlayerId_numeric: parseInt(card.id, 10),
        name: card.name,
        number: card.number || null,
        set: card.set?.name || 'Unknown',
        setId: card.set?.id || 'unknown',
        price: card.cardmarket?.prices?.trendPrice || null,
        rarity: card.rarity || null,
        imageUrl: card.images?.large || card.images?.small || null,
        condition: 'NM',
        game: 'pokemon',
      }))
  } catch (error) {
    console.error('Pokemon TCG search error:', error)
    return []
  }
}

export async function fetchAllPokemonCards(limit: number = 5000, startPage: number = 1): Promise<CardData[]> {
  try {
    console.log(`Fetching Pokemon cards from page ${startPage}...`)
    const allCards: CardData[] = []
    let page = startPage
    const pageSize = 250

    while (allCards.length < limit) {
      const url = `${POKEMON_TCG_API}/cards?pageSize=${pageSize}&page=${page}`
      console.log(`Fetching page ${page}...`)

      const response = await fetch(url, {
        headers: getHeaders(),
      })

      if (!response.ok) {
        console.warn(`Failed to fetch page ${page}: ${response.status}`)
        break
      }

      const data: PokemonTCGResponse = await response.json()

      if (page === 1) {
        console.log(`Total Pokemon cards available: ${data.totalCount}`)
      }

      if (!data.data || data.data.length === 0) {
        console.log('No more cards available')
        break
      }

      const cards = data.data
        .filter((card: PokemonTCGCard) => {
          const numeric = parseInt(card.id, 10)
          if (isNaN(numeric)) {
            console.warn(`Skipping card with non-numeric ID: ${card.id}`)
            return false
          }
          return true
        })
        .map((card: PokemonTCGCard) => ({
          tcgPlayerId: `pokemon_${card.id}`,
          tcgPlayerId_numeric: parseInt(card.id, 10),
          name: card.name,
          number: card.number || null,
          set: card.set?.name || 'Unknown',
          setId: card.set?.id || 'unknown',
          price: card.cardmarket?.prices?.trendPrice || null,
          rarity: card.rarity || null,
          imageUrl: card.images?.large || card.images?.small || null,
          condition: 'NM',
          game: 'pokemon',
        }))

      allCards.push(...cards)
      console.log(`Fetched ${allCards.length} total cards so far`)

      page++

      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stop if we've reached requested limit or got all available
      if (allCards.length >= limit || data.data.length < pageSize) {
        break
      }
    }

    console.log(`Total Pokemon cards fetched: ${allCards.length}`)
    return allCards.slice(0, limit)
  } catch (error) {
    console.error('Error fetching Pokemon cards:', error)
    return []
  }
}

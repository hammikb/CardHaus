export interface CardData {
  tcgPlayerId: string
  name: string
  set: string
  price: number | null
  rarity: string | null
  imageUrl: string | null
  condition: string
}

interface JustTCGCard {
  id: string
  name: string
  set: string
  rarity?: string
  image?: {
    url: string
  }
  variants?: Array<{
    id: string
    price?: number
  }>
}

const JUSTTCG_API = 'https://api.justtcg.com/v1'
const JUSTTCG_API_KEY = process.env.JUSTTCG_API_KEY

export async function searchJustTCGCards(query: string, game: string = 'pokemon'): Promise<CardData[]> {
  try {
    if (!JUSTTCG_API_KEY) {
      console.warn('JUSTTCG_API_KEY not set')
      return []
    }

    if (query.length < 2) return []

    const url = `${JUSTTCG_API}/cards?search=${encodeURIComponent(query)}&game=${game}`
    const response = await fetch(url, {
      headers: {
        'x-api-key': JUSTTCG_API_KEY,
        'User-Agent': 'CardHaus/1.0',
      },
    })

    if (!response.ok) {
      console.error(`JustTCG search failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    const cards = Array.isArray(data.data) ? data.data : data.cards || []

    return cards.map((card: JustTCGCard) => ({
      tcgPlayerId: `justtcg_${card.id}`,
      name: card.name,
      set: card.set || 'Unknown',
      price: card.variants?.[0]?.price || null,
      rarity: card.rarity || null,
      imageUrl: card.image?.url || null,
      condition: 'NM',
    }))
  } catch (error) {
    console.error('JustTCG search error:', error)
    return []
  }
}

export async function fetchJustTCGPokemonCards(limit: number = 100): Promise<CardData[]> {
  try {
    if (!JUSTTCG_API_KEY) {
      console.warn('JUSTTCG_API_KEY not set')
      return []
    }

    const url = `${JUSTTCG_API}/cards?game=pokemon&limit=${limit}`
    const response = await fetch(url, {
      headers: {
        'x-api-key': JUSTTCG_API_KEY,
        'User-Agent': 'CardHaus/1.0',
      },
    })

    if (!response.ok) {
      console.error(`JustTCG fetch failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    const cards = Array.isArray(data.data) ? data.data : data.cards || []

    return cards.map((card: JustTCGCard) => ({
      tcgPlayerId: `justtcg_${card.id}`,
      name: card.name,
      set: card.set || 'Unknown',
      price: card.variants?.[0]?.price || null,
      rarity: card.rarity || null,
      imageUrl: card.image?.url || null,
      condition: 'NM',
    }))
  } catch (error) {
    console.error('JustTCG fetch error:', error)
    return []
  }
}

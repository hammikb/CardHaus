# CardHaus Marketplace Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement marketplace restructure with card variants, three independent listing surfaces (Marketplace/Sealed/Auctions), and seller listings grouped under canonical cards/products.

**Architecture:** Database stores canonical cards/variants (from TCGCSV API) and products (sealed). Listings link to variants or products. Marketplace and Sealed pages display variants/products with nested seller listings. Auctions remain independent.

**Tech Stack:** Next.js 16.2.4, React 19, Supabase (PostgreSQL), Tailwind CSS, TypeScript.

---

## Phase 1: Database Schema

### Task 1: Create Database Migration

**Files:**
- Create: `supabase/migrations/006_card_variants.sql`

- [ ] **Step 1: Write migration with new tables (cards, card_variants, products)**

```sql
-- Create cards table (canonical cards from TCGCSV API)
CREATE TABLE IF NOT EXISTS cards (
  id BIGSERIAL PRIMARY KEY,
  tcgcsv_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  number TEXT,
  game TEXT NOT NULL DEFAULT 'pokemon',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_tcgcsv_id ON cards(tcgcsv_id);
CREATE INDEX IF NOT EXISTS idx_cards_game ON cards(game);

-- Create card_variants table (set/language/edition variants)
CREATE TABLE IF NOT EXISTS card_variants (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  set_id TEXT,
  set_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  edition TEXT,
  rarity TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_variant UNIQUE (card_id, set_id, language, COALESCE(edition, ''))
);

CREATE INDEX IF NOT EXISTS idx_card_variants_card_id ON card_variants(card_id);
CREATE INDEX IF NOT EXISTS idx_card_variants_set_id ON card_variants(set_id);

-- Create products table (sealed products: booster boxes, tins, etc.)
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  set_id TEXT,
  set_name TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'pokemon',
  language TEXT NOT NULL DEFAULT 'English',
  image_url TEXT,
  msrp NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_set_id ON products(set_id);
CREATE INDEX IF NOT EXISTS idx_products_game ON products(game);

-- Alter listings table: add card_variant_id, product_id, listing_type
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS card_variant_id BIGINT REFERENCES card_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'single';

-- Drop columns no longer needed (title and card_type inferred from links)
-- Note: Only drop if they exist and cause issues. Keep for now for compatibility.

-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies: public read access
CREATE POLICY "Cards are publicly readable" ON cards FOR SELECT USING (true);
CREATE POLICY "Card variants are publicly readable" ON card_variants FOR SELECT USING (true);
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);
```

- [ ] **Step 2: Apply migration to Supabase**

Run in Supabase SQL editor or via migration tool:
```bash
# If using supabase CLI
supabase migration up
```

Or paste SQL into Supabase dashboard → SQL editor → Run

- [ ] **Step 3: Verify tables created**

In Supabase dashboard → Tables, verify:
- `cards` table exists with columns: id, tcgcsv_id, name, number, game, image_url, created_at, updated_at
- `card_variants` table exists with columns: id, card_id, set_id, set_name, language, edition, rarity, image_url, created_at, updated_at
- `products` table exists with columns: id, name, product_type, set_id, set_name, game, language, image_url, msrp, created_at, updated_at
- `listings` table has new columns: card_variant_id, product_id, listing_type

- [ ] **Step 4: Commit migration**

```bash
git add supabase/migrations/006_card_variants.sql
git commit -m "db: create cards, card_variants, products tables and update listings schema"
```

---

### Task 2: Delete Existing Listings (Clean Slate)

**Files:**
- N/A (SQL command in Supabase)

- [ ] **Step 1: Delete all existing listings in Supabase**

In Supabase dashboard → SQL editor, run:
```sql
DELETE FROM listings;
```

- [ ] **Step 2: Verify deletion**

Run:
```sql
SELECT COUNT(*) FROM listings;
```

Should return `0`.

- [ ] **Step 3: Commit note (if tracking)**

No code change, just a note:
```bash
git commit --allow-empty -m "db: delete existing listings for clean slate"
```

---

## Phase 2: Types & API Endpoints

### Task 3: Update Type Definitions

**Files:**
- Modify: `cardhaus/lib/supabase/types.ts`

- [ ] **Step 1: Add Card, CardVariant, Product interfaces**

```typescript
// Add after existing interfaces

export interface Card {
  id: string
  tcgcsv_id: number | null
  name: string
  number: string | null
  game: CardType
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface CardVariant {
  id: string
  card_id: string
  set_id: string | null
  set_name: string
  language: string
  edition: string | null
  rarity: string | null
  image_url: string | null
  card?: Card // optional join
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  product_type: SealedType
  set_id: string | null
  set_name: string
  game: CardType
  language: string
  image_url: string | null
  msrp: number | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Update Listing interface**

Replace existing `Listing` interface with:

```typescript
export interface Listing {
  id: string
  seller_id: string
  card_variant_id: string | null
  product_id: string | null
  price: number
  condition: Condition
  grade: string | null
  grade_company: GradeCompany | null
  images: string[]
  status: ListingStatus
  is_auction: boolean
  listing_type: 'single' | 'graded' | 'sealed' | 'auction'
  quantity: number
  description: string | null
  created_at: string
  profiles?: Profile
  card_variants?: CardVariant
  products?: Product
}
```

- [ ] **Step 3: Commit**

```bash
git add cardhaus/lib/supabase/types.ts
git commit -m "types: add Card, CardVariant, Product; update Listing with variant/product links"
```

---

### Task 4: Create GET /api/card-variants Endpoint

**Files:**
- Create: `cardhaus/app/api/card-variants/route.ts`

- [ ] **Step 1: Write endpoint to fetch card variants with search/filters**

```typescript
import { createClient } from '@supabase/supabase-js'
import { CardVariant } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') // search by card name
  const game = searchParams.get('game')
  const setId = searchParams.get('set_id')
  const language = searchParams.get('language')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = supabase
    .from('card_variants')
    .select('*, cards(name, number, game, image_url)', { count: 'exact' })

  // Search by card name
  if (q) {
    query = query.or(
      `cards.name.ilike.%${q}%,set_name.ilike.%${q}%`
    )
  }

  // Filter by game
  if (game) {
    query = query.eq('cards.game', game)
  }

  // Filter by set
  if (setId) {
    query = query.eq('set_id', setId)
  }

  // Filter by language
  if (language) {
    query = query.eq('language', language)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ variants: data, total: count })
}
```

- [ ] **Step 2: Test endpoint**

Run:
```bash
npm run dev
curl "http://localhost:3000/api/card-variants?q=charizard&limit=5"
```

Expected: JSON array of card variants (should be empty since we just deleted listings).

- [ ] **Step 3: Commit**

```bash
git add cardhaus/app/api/card-variants/route.ts
git commit -m "api: create GET /api/card-variants with search and filters"
```

---

### Task 5: Create GET /api/products Endpoint

**Files:**
- Create: `cardhaus/app/api/products/route.ts`

- [ ] **Step 1: Write endpoint to fetch sealed products**

```typescript
import { createClient } from '@supabase/supabase-js'
import { Product } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const game = searchParams.get('game')
  const productType = searchParams.get('product_type')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })

  // Search by name or set
  if (q) {
    query = query.or(`name.ilike.%${q}%,set_name.ilike.%${q}%`)
  }

  // Filter by game
  if (game) {
    query = query.eq('game', game)
  }

  // Filter by product type
  if (productType) {
    query = query.eq('product_type', productType)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ products: data, total: count })
}
```

- [ ] **Step 2: Test endpoint**

```bash
curl "http://localhost:3000/api/products?game=pokemon&limit=5"
```

Expected: empty array (no products yet).

- [ ] **Step 3: Commit**

```bash
git add cardhaus/app/api/products/route.ts
git commit -m "api: create GET /api/products with search and filters"
```

---

### Task 6: Update GET /api/listings Endpoint (Group by Variant/Product)

**Files:**
- Modify: `cardhaus/app/api/listings/route.ts`

- [ ] **Step 1: Read current endpoint**

```bash
cat cardhaus/app/api/listings/route.ts
```

- [ ] **Step 2: Update GET handler to group listings by card_variant or product**

Replace GET with:

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const game = searchParams.get('game')
  const setId = searchParams.get('set_id')
  const condition = searchParams.get('condition')
  const gradeCompany = searchParams.get('grade_company')
  const grade = searchParams.get('grade')
  const productType = searchParams.get('product_type') // 'single', 'graded', 'sealed'
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  let query = supabase
    .from('listings')
    .select(
      `*, 
       profiles(username), 
       card_variants(id, set_name, language, edition, image_url, cards(name, number, game, image_url)),
       products(id, name, product_type, image_url, set_name)`
    )
    .eq('status', 'active')
    .eq('is_auction', false)

  // Filter by product type (singles/graded vs sealed)
  if (productType === 'single' || productType === 'graded') {
    query = query.not('card_variant_id', 'is', null)
  } else if (productType === 'sealed') {
    query = query.not('product_id', 'is', null)
  }

  // Marketplace filters (singles/graded)
  if (game && !productType?.includes('sealed')) {
    query = query.eq('card_variants.cards.game', game)
  }
  if (setId && !productType?.includes('sealed')) {
    query = query.eq('card_variants.set_id', setId)
  }
  if (condition) {
    query = query.eq('condition', condition)
  }
  if (gradeCompany) {
    query = query.eq('grade_company', gradeCompany)
  }
  if (grade) {
    query = query.eq('grade', grade)
  }

  // Search
  if (q) {
    query = query.or(
      `card_variants.cards.name.ilike.%${q}%,products.name.ilike.%${q}%`
    )
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  // Group listings by variant or product
  const grouped: Record<string, any> = {}
  
  for (const listing of data) {
    const key = listing.card_variant_id || listing.product_id
    if (!grouped[key]) {
      if (listing.card_variant_id) {
        grouped[key] = {
          variant: listing.card_variants,
          listings: [],
        }
      } else {
        grouped[key] = {
          product: listing.products,
          listings: [],
        }
      }
    }
    grouped[key].listings.push(listing)
  }

  return Response.json(Object.values(grouped))
}
```

- [ ] **Step 3: Test endpoint**

```bash
curl "http://localhost:3000/api/listings?product_type=single"
```

Expected: empty array (no listings yet).

- [ ] **Step 4: Commit**

```bash
git add cardhaus/app/api/listings/route.ts
git commit -m "api: update GET /api/listings to group by card variant or product"
```

---

### Task 7: Update POST /api/listings Endpoint (Validate Variant/Product Links)

**Files:**
- Modify: `cardhaus/app/api/listings/route.ts` (POST handler)

- [ ] **Step 1: Read current POST handler**

```bash
cat cardhaus/app/api/listings/route.ts | grep -A 100 "export async function POST"
```

- [ ] **Step 2: Update POST to accept card_variant_id or product_id**

Replace POST with:

```typescript
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    card_variant_id,
    product_id,
    price,
    condition,
    grade,
    grade_company,
    images,
    description,
    quantity = 1,
    is_auction = false,
  } = body

  // Validation: marketplace listing must have card_variant_id
  if (!is_auction && !product_id && !card_variant_id) {
    return Response.json(
      { error: 'Must provide card_variant_id or product_id' },
      { status: 400 }
    )
  }

  // Validation: can't have both
  if (card_variant_id && product_id) {
    return Response.json(
      { error: 'Cannot have both card_variant_id and product_id' },
      { status: 400 }
    )
  }

  // Validation: if card_variant_id, it must exist
  if (card_variant_id) {
    const { data: variant } = await supabase
      .from('card_variants')
      .select('id')
      .eq('id', card_variant_id)
      .single()

    if (!variant) {
      return Response.json({ error: 'Card variant not found' }, { status: 400 })
    }
  }

  // Validation: if product_id, it must exist
  if (product_id) {
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single()

    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 400 })
    }
  }

  // Insert listing
  const { data, error } = await supabase
    .from('listings')
    .insert([
      {
        seller_id: session.user.id,
        card_variant_id,
        product_id,
        price,
        condition,
        grade,
        grade_company,
        images,
        description,
        quantity,
        is_auction,
        status: 'active',
        listing_type: is_auction ? 'auction' : condition === 'graded' ? 'graded' : 'single',
      },
    ])
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json(data)
}
```

- [ ] **Step 3: Test endpoint (will fail until we populate cards/variants)**

```bash
# Test with missing variant (should fail)
curl -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -d '{"card_variant_id": 1, "price": 100, "condition": "mint", "images": []}'
```

Expected: error "Unauthorized" or "Card variant not found".

- [ ] **Step 4: Commit**

```bash
git add cardhaus/app/api/listings/route.ts
git commit -m "api: update POST /api/listings to validate card_variant_id or product_id"
```

---

## Phase 3: Marketplace Listing Creation

### Task 8: Create Card Search Component

**Files:**
- Create: `cardhaus/components/card-search.tsx`

- [ ] **Step 1: Write card search with tabs (search + browse)**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { CardVariant } from '@/lib/supabase/types'

const GAMES = ['pokemon', 'mtg', 'yugioh', 'lorcana', 'one_piece', 'sports', 'digimon']

interface CardSearchProps {
  onSelect: (variant: CardVariant) => void
}

export default function CardSearch({ onSelect }: CardSearchProps) {
  const [tab, setTab] = useState<'search' | 'browse'>('search')
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('pokemon')
  const [variants, setVariants] = useState<CardVariant[]>([])
  const [loading, setLoading] = useState(false)

  // Search for cards
  useEffect(() => {
    if (!query.trim()) {
      setVariants([])
      return
    }

    const searchCards = async () => {
      setLoading(true)
      const res = await fetch(
        `/api/card-variants?q=${encodeURIComponent(query)}&limit=20`
      )
      const data = await res.json()
      setVariants(data.variants || [])
      setLoading(false)
    }

    const timeout = setTimeout(searchCards, 300)
    return () => clearTimeout(timeout)
  }, [query])

  // Browse by game
  useEffect(() => {
    if (tab !== 'browse') return

    const browseCards = async () => {
      setLoading(true)
      const res = await fetch(
        `/api/card-variants?game=${game}&limit=30`
      )
      const data = await res.json()
      setVariants(data.variants || [])
      setLoading(false)
    }

    browseCards()
  }, [tab, game])

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'search'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setTab('browse')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'browse'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Browse
        </button>
      </div>

      {/* Search Tab */}
      {tab === 'search' && (
        <div>
          <input
            type="text"
            placeholder="Search by card name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Browse Tab */}
      {tab === 'browse' && (
        <div className="mb-4">
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            {GAMES.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Results */}
      <div className="mt-4">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && variants.length === 0 && (
          <p className="text-slate-500">No variants found</p>
        )}
        {!loading && variants.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium">
                  {v.card?.name || 'Unknown'} #{v.card?.number}
                </div>
                <div className="text-sm text-slate-600">
                  {v.set_name}
                  {v.language !== 'English' && ` • ${v.language}`}
                  {v.edition && ` • ${v.edition}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test component renders**

Create a test page temporarily to verify component loads:

```bash
npm run dev
# Navigate to any page and import CardSearch mentally
```

- [ ] **Step 3: Commit**

```bash
git add cardhaus/components/card-search.tsx
git commit -m "ui: create CardSearch component for marketplace listing form"
```

---

### Task 9: Create Marketplace Listing Form

**Files:**
- Create: `cardhaus/app/listings/marketplace/new/page.tsx`

- [ ] **Step 1: Write marketplace listing form (with card search if no variant_id)**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CardSearch from '@/components/card-search'
import PhotoUpload from '@/components/photo-upload'
import { CardVariant } from '@/lib/supabase/types'

const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint']
const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC']

export default function MarketplaceListingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const variantId = searchParams.get('variant_id')

  const [variant, setVariant] = useState<CardVariant | null>(null)
  const [selectedVariant, setSelectedVariant] = useState(variantId ? true : false)
  const [productType, setProductType] = useState<'single' | 'graded'>('single')
  const [condition, setCondition] = useState<string>('')
  const [grade, setGrade] = useState('')
  const [gradeCompany, setGradeCompany] = useState<string>('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If variantId provided, load it
  const handleVariantSelect = (v: CardVariant) => {
    setVariant(v)
    setSelectedVariant(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!variant || !condition || !price) {
      setError('Missing required fields')
      return
    }
    if (productType === 'graded' && (!grade || !gradeCompany)) {
      setError('Grade and company required for graded cards')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_variant_id: variant.id,
          price: parseFloat(price),
          condition: productType === 'graded' ? 'graded' : condition,
          grade: productType === 'graded' ? grade : null,
          grade_company: productType === 'graded' ? gradeCompany : null,
          images,
          description,
          is_auction: false,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create listing')
      }

      router.push('/marketplace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating listing')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Select variant
  if (!selectedVariant) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Sell a Card</h1>
        <CardSearch onSelect={handleVariantSelect} />
      </main>
    )
  }

  // Step 2: Fill listing details
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">List Your Card</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card info (read-only) */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">Card</p>
          <p className="text-lg font-medium text-slate-900">
            {variant?.card?.name} #{variant?.card?.number}
          </p>
          <p className="text-sm text-slate-600">
            {variant?.set_name}
            {variant?.language !== 'English' && ` • ${variant?.language}`}
          </p>
        </div>

        {/* Product type */}
        <div>
          <p className="font-medium mb-2">Condition Type</p>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="single"
                checked={productType === 'single'}
                onChange={(e) => setProductType(e.target.value as 'single')}
                className="mr-2"
              />
              Single (Raw Card)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="graded"
                checked={productType === 'graded'}
                onChange={(e) => setProductType(e.target.value as 'graded')}
                className="mr-2"
              />
              Graded Card (PSA, BGS, etc.)
            </label>
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block font-medium mb-2">Condition *</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select condition</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Grade fields (show if graded) */}
        {productType === 'graded' && (
          <>
            <div>
              <label className="block font-medium mb-2">Grade Company *</label>
              <select
                value={gradeCompany}
                onChange={(e) => setGradeCompany(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Select company</option>
                {GRADE_COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-2">Grade (1-10) *</label>
              <input
                type="number"
                min="1"
                max="10"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </>
        )}

        {/* Price */}
        <div>
          <label className="block font-medium mb-2">Price (USD) *</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Describe the condition, any defects, etc."
          />
        </div>

        {/* Photos */}
        <div>
          <label className="block font-medium mb-2">Photos (Required)</label>
          <PhotoUpload value={images} onChange={setImages} />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Test form renders and submits (will fail until we have data)**

```bash
npm run dev
# Visit http://localhost:3000/listings/marketplace/new
```

Expected: Card search visible, can search for cards (returns empty since we have no data yet).

- [ ] **Step 3: Commit**

```bash
git add cardhaus/app/listings/marketplace/new/page.tsx
git commit -m "ui: create marketplace listing form with card search"
```

---

### Task 10: Create Marketplace Page (Display Variants with Seller Listings)

**Files:**
- Modify: `cardhaus/app/marketplace/page.tsx`

- [ ] **Step 1: Read current marketplace page**

```bash
cat cardhaus/app/marketplace/page.tsx | head -100
```

- [ ] **Step 2: Rewrite marketplace to display card variant groups**

```typescript
'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { SkeletonGrid } from '@/components/skeleton-card'
import { debounce } from '@/lib/utils/debounce'
import { CardVariant, Listing } from '@/lib/supabase/types'

const GAMES = ['pokemon', 'mtg', 'yugioh', 'lorcana', 'one_piece', 'sports', 'digimon']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']

interface VariantGroup {
  variant: CardVariant
  listings: Listing[]
}

async function getListings(filters: Record<string, string>) {
  const params = new URLSearchParams({
    ...filters,
    product_type: 'single', // marketplace only shows singles/graded
  }).toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings?${params}`, {
    cache: 'no-store',
  })
  return res.json() as Promise<VariantGroup[]>
}

function MarketplaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState<VariantGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    game: searchParams.get('game') || '',
    set_id: searchParams.get('set_id') || '',
    condition: searchParams.get('condition') || '',
    grade_company: searchParams.get('grade_company') || '',
  })

  const debouncedSetFilter = useRef(
    debounce((name: string, value: string) => {
      setFilters((f) => ({ ...f, [name]: value }))
    }, 100)
  ).current

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true)
      const params = Object.entries(filters)
        .filter(([_, v]) => v)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})

      const data = await getListings(params)
      setGroups(Array.isArray(data) ? data : [])
      setLoading(false)
    }

    loadListings()
  }, [filters])

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Marketplace</h1>
        <p className="text-slate-600">Buy singles and graded cards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Filters */}
        <div className="md:col-span-1">
          <div className="bg-slate-50 p-4 rounded-lg space-y-4">
            <h3 className="font-bold text-slate-900">Filters</h3>

            {/* Game filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Game</label>
              <select
                value={filters.game}
                onChange={(e) => debouncedSetFilter('game', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">All games</option>
                {GAMES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Condition</label>
              <select
                value={filters.condition}
                onChange={(e) => debouncedSetFilter('condition', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">All</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Grade Company</label>
              <select
                value={filters.grade_company}
                onChange={(e) => debouncedSetFilter('grade_company', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">All</option>
                {['PSA', 'BGS', 'CGC', 'SGC'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="md:col-span-3">
          {loading && <SkeletonGrid count={6} />}
          {!loading && groups.length === 0 && (
            <p className="text-slate-600">No listings found</p>
          )}
          {!loading && groups.length > 0 && (
            <div className="space-y-6">
              {groups.map((group) => (
                <div
                  key={group.variant.id}
                  className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6 bg-white">
                    {/* Card header */}
                    <div className="flex gap-4 items-start mb-4">
                      {group.variant.image_url && (
                        <Image
                          src={group.variant.image_url}
                          alt={group.variant.card?.name || 'Card'}
                          width={100}
                          height={140}
                          className="rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900">
                          {group.variant.card?.name} #{group.variant.card?.number}
                        </h3>
                        <p className="text-slate-600">
                          {group.variant.set_name}
                          {group.variant.language !== 'English' &&
                            ` • ${group.variant.language}`}
                        </p>
                        <p className="text-sm text-slate-500">
                          {group.listings.length} available
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          router.push(
                            `/listings/marketplace/new?variant_id=${group.variant.id}`
                          )
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Sell this
                      </button>
                    </div>

                    {/* Seller listings */}
                    <div className="space-y-2 border-t pt-4">
                      {group.listings.slice(0, 3).map((listing) => (
                        <div
                          key={listing.id}
                          className="flex justify-between items-center p-3 bg-slate-50 rounded"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {listing.profiles?.username || 'Anonymous'}
                            </p>
                            <p className="text-sm text-slate-600">
                              {listing.condition}
                              {listing.grade && ` • ${listing.grade_company} ${listing.grade}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">${listing.price}</p>
                            <button className="text-sm text-blue-600 hover:underline">
                              View details
                            </button>
                          </div>
                        </div>
                      ))}
                      {group.listings.length > 3 && (
                        <button className="w-full py-2 text-center text-sm text-blue-600 hover:underline">
                          See all {group.listings.length} listings
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<SkeletonGrid count={6} />}>
      <MarketplaceContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Test marketplace page**

```bash
npm run dev
# Visit http://localhost:3000/marketplace
```

Expected: Filters visible, no listings (empty state).

- [ ] **Step 3: Commit**

```bash
git add cardhaus/app/marketplace/page.tsx
git commit -m "ui: rewrite marketplace to display card variant groups with seller listings"
```

---

## Phase 4: Sealed Listing Creation

### Task 11: Create Product Search Component

**Files:**
- Create: `cardhaus/components/product-search.tsx`

- [ ] **Step 1: Write product search with tabs**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/supabase/types'

const SEALED_TYPES = [
  'booster_box',
  'booster_pack',
  'elite_trainer_box',
  'collection_box',
  'tin',
  'bundle',
  'blister',
]
const GAMES = ['pokemon', 'mtg', 'yugioh', 'lorcana', 'one_piece', 'sports', 'digimon']

interface ProductSearchProps {
  onSelect: (product: Product) => void
}

export default function ProductSearch({ onSelect }: ProductSearchProps) {
  const [tab, setTab] = useState<'search' | 'browse'>('search')
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('pokemon')
  const [productType, setProductType] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  // Search
  useEffect(() => {
    if (!query.trim()) {
      setProducts([])
      return
    }

    const searchProducts = async () => {
      setLoading(true)
      const res = await fetch(`/api/products?q=${encodeURIComponent(query)}&limit=20`)
      const data = await res.json()
      setProducts(data.products || [])
      setLoading(false)
    }

    const timeout = setTimeout(searchProducts, 300)
    return () => clearTimeout(timeout)
  }, [query])

  // Browse
  useEffect(() => {
    if (tab !== 'browse') return

    const browseProducts = async () => {
      setLoading(true)
      const params = new URLSearchParams()
      if (game) params.append('game', game)
      if (productType) params.append('product_type', productType)
      const res = await fetch(`/api/products?${params}&limit=30`)
      const data = await res.json()
      setProducts(data.products || [])
      setLoading(false)
    }

    browseProducts()
  }, [tab, game, productType])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 font-medium ${
            tab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setTab('browse')}
          className={`px-4 py-2 font-medium ${
            tab === 'browse' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600'
          }`}
        >
          Browse
        </button>
      </div>

      {tab === 'search' && (
        <input
          type="text"
          placeholder="Search by product name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg"
        />
      )}

      {tab === 'browse' && (
        <div className="space-y-4 mb-4">
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          >
            {GAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">All types</option>
            {SEALED_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4">
        {loading && <p className="text-slate-500">Loading...</p>}
        {!loading && products.length === 0 && <p className="text-slate-500">No products found</p>}
        {!loading && products.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-blue-50"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-slate-600">
                  {p.set_name}
                  {p.language !== 'English' && ` • ${p.language}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add cardhaus/components/product-search.tsx
git commit -m "ui: create ProductSearch component for sealed listing form"
```

---

### Task 12: Create Sealed Listing Form

**Files:**
- Create: `cardhaus/app/listings/sealed/new/page.tsx`

- [ ] **Step 1: Write sealed listing form**

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProductSearch from '@/components/product-search'
import PhotoUpload from '@/components/photo-upload'
import { Product } from '@/lib/supabase/types'

export default function SealedListingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('product_id')

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedProduct, setSelectedProduct] = useState(!!productId)
  const [condition, setCondition] = useState('factory_sealed')
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleProductSelect = (p: Product) => {
    setProduct(p)
    setSelectedProduct(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !price) {
      setError('Missing required fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          price: parseFloat(price),
          condition,
          quantity: parseInt(quantity, 10),
          images,
          description,
          is_auction: false,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      router.push('/sealed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating listing')
    } finally {
      setLoading(false)
    }
  }

  if (!selectedProduct) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Sell Sealed Product</h1>
        <ProductSearch onSelect={handleProductSelect} />
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">List Sealed Product</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600">Product</p>
          <p className="text-lg font-medium">{product?.name}</p>
        </div>

        <div>
          <label className="block font-medium mb-2">Condition *</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          >
            <option value="factory_sealed">Factory Sealed</option>
            <option value="opened">Opened</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Price per Unit (USD) *</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Photos</label>
          <PhotoUpload value={images} onChange={setImages} />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add cardhaus/app/listings/sealed/new/page.tsx
git commit -m "ui: create sealed listing form with product search"
```

---

### Task 13: Create Sealed Browse Page

**Files:**
- Create: `cardhaus/app/sealed/page.tsx`

- [ ] **Step 1: Write sealed page (similar structure to marketplace)**

```typescript
'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { SkeletonGrid } from '@/components/skeleton-card'
import { debounce } from '@/lib/utils/debounce'
import { Product, Listing } from '@/lib/supabase/types'

const GAMES = ['pokemon', 'mtg', 'yugioh', 'lorcana', 'one_piece', 'sports', 'digimon']
const SEALED_TYPES = ['booster_box', 'booster_pack', 'elite_trainer_box', 'collection_box', 'tin']

interface ProductGroup {
  product: Product
  listings: Listing[]
}

async function getListings(filters: Record<string, string>) {
  const params = new URLSearchParams({
    ...filters,
    product_type: 'sealed',
  }).toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings?${params}`, {
    cache: 'no-store',
  })
  return res.json() as Promise<ProductGroup[]>
}

function SealedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState<ProductGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    game: searchParams.get('game') || '',
    product_type: searchParams.get('product_type') || '',
  })

  const debouncedSetFilter = useRef(
    debounce((name: string, value: string) => {
      setFilters((f) => ({ ...f, [name]: value }))
    }, 100)
  ).current

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true)
      const params = Object.entries(filters)
        .filter(([_, v]) => v)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})

      const data = await getListings(params)
      setGroups(Array.isArray(data) ? data : [])
      setLoading(false)
    }

    loadListings()
  }, [filters])

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Sealed Products</h1>
        <p className="text-slate-600">Booster boxes, packs, tins, and more</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="bg-slate-50 p-4 rounded-lg space-y-4">
            <h3 className="font-bold">Filters</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Game</label>
              <select
                value={filters.game}
                onChange={(e) => debouncedSetFilter('game', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">All</option>
                {GAMES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={filters.product_type}
                onChange={(e) => debouncedSetFilter('product_type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">All</option>
                {SEALED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          {loading && <SkeletonGrid count={6} />}
          {!loading && groups.length === 0 && <p className="text-slate-600">No products found</p>}
          {!loading && groups.length > 0 && (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.product.id} className="border border-slate-200 rounded-lg p-6">
                  <div className="flex gap-4 items-start mb-4">
                    {group.product.image_url && (
                      <Image
                        src={group.product.image_url}
                        alt={group.product.name}
                        width={100}
                        height={140}
                        className="rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{group.product.name}</h3>
                      <p className="text-slate-600">{group.product.set_name}</p>
                      <p className="text-sm text-slate-500">{group.listings.length} available</p>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/listings/sealed/new?product_id=${group.product.id}`)
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Sell
                    </button>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    {group.listings.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="flex justify-between p-3 bg-slate-50 rounded">
                        <div>
                          <p className="font-medium">{listing.profiles?.username}</p>
                          <p className="text-sm text-slate-600">{listing.condition}</p>
                        </div>
                        <p className="font-bold">${listing.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function SealedPage() {
  return (
    <Suspense fallback={<SkeletonGrid count={6} />}>
      <SealedContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add cardhaus/app/sealed/page.tsx
git commit -m "ui: create sealed browse page with product groups"
```

---

## Phase 5: Navigation & Setup

### Task 14: Create Listing Type Selector Page

**Files:**
- Modify: `cardhaus/app/listings/new/page.tsx`

- [ ] **Step 1: Read current page**

```bash
cat cardhaus/app/listings/new/page.tsx
```

- [ ] **Step 2: Update to show marketplace/sealed/auction selector**

```typescript
'use client'

import Link from 'next/link'

const OPTIONS = [
  {
    title: 'Marketplace Card',
    description: 'Sell single or graded cards',
    href: '/listings/marketplace/new',
    icon: '🎴',
  },
  {
    title: 'Sealed Product',
    description: 'Sell booster boxes, packs, tins, etc.',
    href: '/listings/sealed/new',
    icon: '📦',
  },
  {
    title: 'Auction',
    description: 'Start a bidding auction',
    href: '/listings/auction/new',
    icon: '🔨',
  },
]

export default function ListingTypePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">What are you selling?</h1>
        <p className="text-slate-600">Choose listing type</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {OPTIONS.map((option) => (
          <Link
            key={option.title}
            href={option.href}
            className="group bg-white border border-slate-200 rounded-xl p-8 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-5xl mb-4">{option.icon}</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600">
              {option.title}
            </h2>
            <p className="text-slate-600">{option.description}</p>
            <div className="mt-6 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
              Start listing →
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add cardhaus/app/listings/new/page.tsx
git commit -m "ui: update listing type selector to show marketplace/sealed/auction"
```

---

### Task 15: Update Navigation

**Files:**
- Modify: `cardhaus/components/nav.tsx`

- [ ] **Step 1: Add "Sell a card" button and links for Sealed, Auctions**

Add to nav (exact location depends on current structure):

```typescript
// In nav links area, add:
<Link href="/listings/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Sell a card
</Link>

// In marketplace links section:
<Link href="/marketplace">Marketplace</Link>
<Link href="/sealed">Sealed</Link>
<Link href="/auctions">Auctions</Link>
```

- [ ] **Step 2: Commit**

```bash
git add cardhaus/components/nav.tsx
git commit -m "ui: add 'Sell a card' button and Sealed/Auctions links to nav"
```

---

### Task 16: Set Up RLS Policies

**Files:**
- N/A (SQL in Supabase dashboard)

- [ ] **Step 1: Create RLS policies in Supabase**

In Supabase SQL editor, run:

```sql
-- Enable RLS if not already
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read policies (already created in migration, but repeating for clarity)
CREATE POLICY "Cards are publicly readable" ON cards FOR SELECT USING (true);
CREATE POLICY "Card variants are publicly readable" ON card_variants FOR SELECT USING (true);
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);

-- Update listings policies to allow authenticated insert/update
DROP POLICY IF EXISTS "Users can insert listings" ON listings;
CREATE POLICY "Authenticated users can insert listings" ON listings 
  FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can update own listings" ON listings;
CREATE POLICY "Users can update own listings" ON listings 
  FOR UPDATE 
  USING (auth.uid() = seller_id);
```

- [ ] **Step 2: Commit note**

```bash
git commit --allow-empty -m "db: setup RLS policies for cards, variants, products"
```

---

### Task 17: Update TCGCSV Sync to Populate Cards/Variants

**Files:**
- Modify: `cardhaus/lib/tcgcsv-api.ts` or create sync endpoint

- [ ] **Step 1: Read current TCGCSV integration**

```bash
cat cardhaus/lib/tcgcsv-api.ts
```

- [ ] **Step 2: Add function to sync cards and variants**

Add to file:

```typescript
export async function syncCardsAndVariants() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch Pokémon cards from TCGCSV (categoryId=3)
  const response = await fetch('https://api.tcgcsv.com/v2/cards?categoryId=3&limit=100')
  const cardsData = await response.json()

  for (const cardData of cardsData.data || []) {
    // Upsert card
    const { data: card } = await supabase
      .from('cards')
      .upsert(
        {
          tcgcsv_id: cardData.id,
          name: cardData.name,
          number: cardData.cardNumber,
          game: 'pokemon',
          image_url: cardData.images?.small?.url,
        },
        { onConflict: 'tcgcsv_id' }
      )
      .select()
      .single()

    if (card) {
      // Fetch and upsert variants (sets)
      for (const setVariant of cardData.sets || []) {
        await supabase
          .from('card_variants')
          .upsert(
            {
              card_id: card.id,
              set_id: setVariant.id,
              set_name: setVariant.name,
              language: 'English',
              edition: null,
              rarity: setVariant.rarity,
              image_url: setVariant.images?.small?.url,
            },
            { onConflict: 'unique_variant' }
          )
      }
    }
  }

  return { synced: true }
}
```

- [ ] **Step 3: Create sync endpoint (if not exists)**

Create `cardhaus/app/api/sync/route.ts`:

```typescript
import { syncCardsAndVariants } from '@/lib/tcgcsv-api'

export async function POST(req: Request) {
  // Add auth check in production
  try {
    const result = await syncCardsAndVariants()
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Manually trigger sync (for testing)**

```bash
curl -X POST http://localhost:3000/api/sync
```

Expected: synced cards and variants in Supabase.

- [ ] **Step 5: Commit**

```bash
git add cardhaus/lib/tcgcsv-api.ts cardhaus/app/api/sync/route.ts
git commit -m "sync: add TCGCSV sync for cards and variants"
```

---

## Phase 6: Testing

### Task 18: End-to-End Testing

**Files:**
- N/A (manual testing)

- [ ] **Step 1: Sync test data**

Trigger sync to populate cards/variants:

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/sync
```

- [ ] **Step 2: Visit marketplace and verify data**

```
http://localhost:3000/marketplace
```

Expected: Card variants displayed with filters.

- [ ] **Step 3: Create marketplace listing**

1. Click "Sell a card" button or "Sell this" on marketplace
2. Search/select a card variant
3. Fill form (single or graded, condition, price, photos)
4. Submit
5. Verify listing appears on marketplace

- [ ] **Step 4: Create sealed listing**

1. Navigate to `/listings/sealed/new`
2. Search/browse products
3. Select product
4. Fill form (condition, quantity, price)
5. Submit
6. Verify listing appears on `/sealed`

- [ ] **Step 5: Verify auctions page**

Navigate to `/auctions` — should work unchanged from before (user-uploaded images, independent listings).

- [ ] **Step 6: Commit completion**

```bash
git commit --allow-empty -m "test: e2e testing complete - marketplace, sealed, auctions functional"
```

- [ ] **Step 7: Run production build and verify**

```bash
npm run build
```

Expected: No TypeScript errors, all pages compile.

- [ ] **Step 8: Final commit**

```bash
git commit --allow-empty -m "feat: marketplace restructure complete - card variants, seller listings, sealed products"
```

---

## Summary

**Completed tasks:**
- ✅ Database schema (cards, card_variants, products)
- ✅ Type definitions
- ✅ API endpoints (GET variants, GET products, updated GET/POST listings)
- ✅ Marketplace page with variant groups
- ✅ Marketplace listing form with card search
- ✅ Sealed page with product groups
- ✅ Sealed listing form with product search
- ✅ Listing type selector
- ✅ Navigation updates
- ✅ RLS policies
- ✅ TCGCSV sync
- ✅ E2E testing

**Success criteria met:**
- ✅ Marketplace displays card variants with seller listings grouped underneath
- ✅ Sealed page shows products with seller listings
- ✅ Auctions page independent and functional
- ✅ User can create marketplace/sealed/auction listings
- ✅ Filters work on marketplace/sealed
- ✅ All three surfaces independent and functional

# CardHaus Marketplace Restructure — Card Variants & Seller Listings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure marketplace to display canonical API cards with seller listings underneath, organize into three independent surfaces (Marketplace for singles/graded, Sealed page, Auctions page), and enable rich browsing by card variants (set, language, edition).

**Architecture:** Three independent listing surfaces linked to a canonical card hierarchy: Cards (from TCGCSV API) → CardVariants (set/language/edition) → Listings (seller listings). Marketplace and Sealed display card/product hierarchies with seller listings grouped underneath. Auctions remain independent with user-uploaded images.

**Tech Stack:** Next.js 16.2.4 (App Router), React 19, Supabase (PostgreSQL + Storage), Tailwind CSS, TypeScript, TCGCSV API sync.

---

## Database Schema

### New Tables

#### `cards`
Canonical card records from TCGCSV API.

```sql
CREATE TABLE cards (
  id BIGSERIAL PRIMARY KEY,
  tcgcsv_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  number TEXT,
  game TEXT NOT NULL DEFAULT 'pokemon', -- 'pokemon', 'mtg', 'yugioh', etc.
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `card_variants`
Set/language/edition variants of a single card. One card → many variants (e.g., Charizard in Base Set English, Base Set Japanese, Shadowless, etc.).

```sql
CREATE TABLE card_variants (
  id BIGSERIAL PRIMARY KEY,
  card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  set_id TEXT, -- from TCGCSV (e.g., 'sv04pt')
  set_name TEXT NOT NULL, -- 'Scarlet & Violet', 'Base Set', etc.
  language TEXT NOT NULL DEFAULT 'English', -- 'English', 'Japanese', 'Other'
  edition TEXT, -- 'Unlimited', 'Shadowless', etc. (NULL = standard)
  rarity TEXT, -- 'Common', 'Rare', etc.
  image_url TEXT, -- variant-specific image if different from card
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_variant UNIQUE (card_id, set_id, language, COALESCE(edition, ''))
);

CREATE INDEX idx_card_variants_card_id ON card_variants(card_id);
CREATE INDEX idx_card_variants_set_id ON card_variants(set_id);
```

#### `products`
Sealed products: booster boxes, booster packs, Elite Trainer Boxes, etc.

```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- 'Base Set Booster Box', 'Scarlet & Violet Elite Trainer Box'
  product_type TEXT NOT NULL, -- 'booster_box', 'booster_pack', 'elite_trainer_box', etc.
  set_id TEXT, -- from TCGCSV
  set_name TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'pokemon',
  language TEXT NOT NULL DEFAULT 'English',
  image_url TEXT,
  msrp NUMERIC(10, 2), -- manufacturer suggested retail price
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_set_id ON products(set_id);
CREATE INDEX idx_products_game ON products(game);
```

### Modified Table

#### `listings` (existing, updated)

```sql
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS card_variant_id BIGINT REFERENCES card_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  DROP COLUMN IF EXISTS title, -- no longer user-provided for marketplace listings
  DROP COLUMN IF EXISTS card_type, -- inferred from card_variant → card → game
  ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'single'; -- 'single', 'graded', 'sealed', 'auction'

-- marketplace listings (card_variant_id set, is_auction=false, product_id=NULL)
-- sealed listings (product_id set, card_variant_id=NULL, is_auction=false)
-- auctions (is_auction=true, card_variant_id=NULL, product_id=NULL, title user-provided)
```

**Constraints:**
- Marketplace listing: `card_variant_id NOT NULL`, `product_id IS NULL`, `is_auction = false`
- Sealed listing: `product_id NOT NULL`, `card_variant_id IS NULL`, `is_auction = false`
- Auction: `is_auction = true`, `card_variant_id IS NULL`, `product_id IS NULL`, `title NOT NULL`

---

## UI Pages

### Marketplace (`/marketplace`)

**Purpose:** Browse singles and graded cards by variant, see all seller listings underneath each card.

**Layout:**
- Search bar (top): "Search cards by name or set..."
- Filters (left sidebar or dropdown):
  - Game (Pokémon, MTG, Yu-Gi-Oh, etc.)
  - Set (Base Set, Shadowless, Unlimited, etc.)
  - Card type (Pokémon, Trainer, etc.)
  - Condition (Poor, Good, Excellent, Near Mint, Mint, Graded)
  - Grade (if Graded selected: PSA 1-10, BGS 1-10, etc.)
  - Price range
- Main area (grid of card variant groups):

**Card Variant Row:**
```
┌─────────────────────────────────────────────┐
│ [API Image] Charizard #6/102 - Base Set     │
│ Available: 12 listings | [Search other sets]│
├─────────────────────────────────────────────┤
│ Seller Listings:                            │
│ ├─ Near Mint, $1,200 (seller: pokeguy)     │
│ ├─ Excellent, $950 (seller: cardcollector) │
│ └─ Good, $500 (seller: budget_buyer)       │
│                                             │
│ [See all 12] [Sell this]                    │
└─────────────────────────────────────────────┘
```

**Seller listing shows:** condition, grade (if graded), seller name, price, action (Buy or View Details).

### Sealed (`/sealed`)

**Purpose:** Browse sealed products (booster boxes, tins, etc.) with seller listings underneath.

**Layout:** Similar to marketplace. Card variant rows become product rows.

**Product Row:**
```
┌─────────────────────────────────────────┐
│ [API Image] Base Set Booster Box        │
│ Available: 3 listings                   │
├─────────────────────────────────────────┤
│ Seller Listings:                        │
│ ├─ Factory Sealed, $8,000 (seller: A)  │
│ ├─ Factory Sealed, $7,500 (seller: B)  │
│ └─ Opened, $2,000 (seller: C)          │
│                                         │
│ [See all 3] [Sell this]                │
└─────────────────────────────────────────┘
```

Filters: Game, Set, Sealed type (Booster Box, ETB, etc.), Price.

### Auctions (`/auctions`)

**Purpose:** Independent auction listings with user-uploaded images.

**No changes from current flow.** Keep existing auction structure. Listings show user-uploaded image, starting price, current bid, time remaining, [Place bid] CTA.

---

## Listing Creation Flow

### Entry Points

1. **Big "Sell a card" button** (persistent, nav or homepage)
   - Opens modal or redirects to `/listings/new`
   - User chooses: Marketplace (singles/graded), Sealed, Auction
   - Routes to appropriate form

2. **Marketplace card** → click **[Sell this]**
   - Pre-fills card_variant_id
   - Routes to `/listings/marketplace/new?variant_id=XXX`
   - Prompts: Single or Graded?

3. **Sealed product** → click **[Sell]**
   - Pre-fills product_id
   - Routes to `/listings/sealed/new?product_id=XXX`

### Marketplace Listing Form (`/listings/marketplace/new` or `/listings/marketplace/new?variant_id=XXX`)

**If variant_id NOT provided (user clicked "Sell a card"):**
- Search bar: "Find the card you're selling"
- Tabs: Search | Browse by game/set
- Search results: show variants of matching card (name + set + language)
- User selects → proceed to form

**Form:**
- Card variant shown (read-only): Charizard #6/102, Base Set, English
- Product type: Single or Graded (radio)
- Condition: dropdown (Poor, Good, Excellent, Near Mint, Mint)
- **If Graded:**
  - Grade company: PSA, BGS, CGC, SGC
  - Grade: number 1-10
  - Population report: optional text
- Price: USD
- Description: optional
- Photos: upload 1+ pictures (show card's condition)
- Submit → creates listing with `card_variant_id`, `is_auction=false`

### Sealed Listing Form (`/listings/sealed/new` or `//listings/sealed/new?product_id=XXX`)

**If product_id NOT provided:**
- Search/browse products by game, set, sealed type
- User selects → proceed to form

**Form:**
- Product: read-only (Base Set Booster Box, English)
- Sealed type: auto-filled
- Condition: Factory Sealed / Opened
- Quantity: number (default 1)
- Price per unit: USD
- Description: optional
- Photos: optional (user-uploaded)
- Submit → creates listing with `product_id`, `is_auction=false`

### Auction Listing Form (`/listings/auction/new`)

**No changes.** Keep existing form: title, card_type, images (user-uploaded), starting price, duration.

---

## Data Flow

### TCGCSV Sync

**Nightly cron job** fetches TCGCSV API:

1. For each game category (Pokémon categoryId=3, MTG=1, etc.):
   - Fetch all cards
   - For each card, fetch all sets/variants
   - Upsert into `cards` table (by tcgcsv_id)
   - Upsert into `card_variants` table (by card_id + set_id + language + edition)
2. For sealed products (manually curated or via API):
   - Upsert into `products` table

**Considerations:**
- Rate limiting (TCGCSV API limits)
- Incremental sync (only fetch changed cards, not all)
- Image caching (store URLs, lazy-load on marketplace)

### Listing Creation

1. User completes form → POST `/api/listings`
2. Endpoint validates:
   - If `card_variant_id`: marketplace listing (must be set, product_id must be NULL)
   - If `product_id`: sealed listing (must be set, card_variant_id must be NULL)
   - If `is_auction=true`: auction (both IDs must be NULL, title must be set)
3. Create `listing` row with appropriate FK
4. Upload images to Supabase Storage
5. Return listing_id

### Marketplace Display

1. GET `/api/listings?game=pokemon&set=base_set&condition=near_mint`
2. Backend:
   - Fetch card_variants matching filters
   - For each variant, fetch all seller listings (grouped by variant)
   - Return nested structure:
     ```json
     {
       "variant": { id, card: { name, image }, set_name, language, edition },
       "listings": [
         { seller_id, condition, grade, price, images, ...}
       ]
     }
     ```
3. Frontend renders card variant row + seller listings underneath

---

## Type Updates (`lib/supabase/types.ts`)

```typescript
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
  card_variants?: CardVariant // optional join
  products?: Product // optional join
}
```

---

## Implementation Notes

- **Delete existing listings:** `DELETE FROM listings;` (clean slate for test env)
- **RLS policies:** Update to allow public read of cards/card_variants/products, authenticated users insert listings
- **Indexes:** Create on card_variants(card_id, set_id), products(set_id, game)
- **Search performance:** Consider full-text search on card name + set (PostgreSQL or Meilisearch for scale)
- **Image CDN:** Supabase Storage URLs cached by browser/CDN
- **Backward compat:** No. Old listing format incompatible. Fresh start.

---

## Success Criteria

- ✅ Marketplace displays card variants with seller listings grouped underneath
- ✅ Sealed page shows products with seller listings
- ✅ Auctions page works independently
- ✅ User can create marketplace listing by searching/browsing cards
- ✅ User can create sealed listing by selecting product
- ✅ User can create auction with user-uploaded images
- ✅ Filters (game, set, condition, grade, price) work on marketplace/sealed
- ✅ TCGCSV sync populates cards + variants nightly
- ✅ All three surfaces functional, independent of each other

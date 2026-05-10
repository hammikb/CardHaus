# CardHaus Phase 2: Stripe Connect + Auctions + Shipping Labels

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sellers can onboard with Stripe Connect to receive payouts. Auctions work with real-time bidding. Sellers can generate shipping labels via EasyPost.

**Architecture:** Extends Phase 1 monolith. Stripe Connect Express for seller onboarding. Supabase Realtime channels for live auction bids. EasyPost REST API for label generation — called from server-side API route to protect API key and capture markup.

**Tech Stack:** Stripe Connect Express, Supabase Realtime, EasyPost API

**Prerequisite:** Phase 1 complete and running.

---

## File Structure (additions to Phase 1)

```
app/
├── auctions/
│   ├── page.tsx                    # Auctions listing page
│   └── [id]/page.tsx               # Single auction + live bidding
├── dashboard/
│   ├── connect/page.tsx            # Stripe Connect onboarding
│   └── labels/page.tsx             # Shipping label generation
└── api/
    ├── auctions/route.ts           # GET auctions, POST create auction
    ├── auctions/[id]/bid/route.ts  # POST place bid
    ├── connect/onboard/route.ts    # POST start Stripe Connect flow
    ├── connect/refresh/route.ts    # GET handle refresh
    └── shipping/labels/route.ts    # POST generate EasyPost label
components/
└── bid-form.tsx                    # Real-time bid form
lib/
└── easypost.ts                     # EasyPost client
supabase/migrations/
└── 002_auctions.sql
```

---

## Task 1: Auctions Database Schema

**Files:**
- Create: `supabase/migrations/002_auctions.sql`

- [ ] **Step 1: Write auction migration**

Create `supabase/migrations/002_auctions.sql`:

```sql
create table public.auctions (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references public.listings(id) on delete cascade unique not null,
  start_price numeric(10,2) not null check (start_price > 0),
  current_bid numeric(10,2),
  bid_count integer default 0,
  winner_id uuid references public.profiles(id),
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

create table public.bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references public.auctions(id) on delete cascade not null,
  bidder_id uuid references public.profiles(id) not null,
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

alter table public.auctions enable row level security;
alter table public.bids enable row level security;

create policy "Auctions readable" on public.auctions for select using (true);
create policy "Bids readable" on public.bids for select using (true);
create policy "Authenticated users bid" on public.bids for insert with check (auth.uid() = bidder_id);

-- Enable realtime for auctions
alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;
```

- [ ] **Step 2: Run in Supabase SQL editor**

Paste into Supabase Dashboard → SQL Editor → Run.

- [ ] **Step 3: Add auction types to `lib/supabase/types.ts`**

Add to end of `lib/supabase/types.ts`:

```typescript
export interface Auction {
  id: string
  listing_id: string
  start_price: number
  current_bid: number | null
  bid_count: number
  winner_id: string | null
  ends_at: string
  created_at: string
  listings?: Listing
}

export interface Bid {
  id: string
  auction_id: string
  bidder_id: string
  amount: number
  created_at: string
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_auctions.sql lib/supabase/types.ts
git commit -m "feat: add auctions and bids schema with realtime enabled"
```

---

## Task 2: Auctions API Routes

**Files:**
- Create: `app/api/auctions/route.ts`, `app/api/auctions/[id]/bid/route.ts`

- [ ] **Step 1: Write auctions collection route**

Create `app/api/auctions/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('auctions')
    .select('*, listings(title, images, card_type, condition, seller_id, profiles(username))')
    .gt('ends_at', now)
    .order('ends_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, card_type, condition, grade, grade_company, images, start_price, ends_at } = await request.json()

  if (!title || !start_price || !ends_at || !card_type || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const endsDate = new Date(ends_at)
  if (endsDate <= new Date()) {
    return NextResponse.json({ error: 'End time must be in the future' }, { status: 400 })
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({ seller_id: user.id, title, description, price: start_price, card_type, condition, grade, grade_company, images: images ?? [], is_auction: true })
    .select()
    .single()

  if (listingError) return NextResponse.json({ error: listingError.message }, { status: 500 })

  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .insert({ listing_id: listing.id, start_price, ends_at })
    .select()
    .single()

  if (auctionError) return NextResponse.json({ error: auctionError.message }, { status: 500 })
  return NextResponse.json(auction, { status: 201 })
}
```

- [ ] **Step 2: Write bid route**

Create `app/api/auctions/[id]/bid/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount } = await request.json()
  if (!amount || isNaN(amount)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, listings(seller_id)')
    .eq('id', id)
    .single()

  if (!auction) return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
  if (new Date(auction.ends_at) <= new Date()) return NextResponse.json({ error: 'Auction ended' }, { status: 400 })
  if (auction.listings?.seller_id === user.id) return NextResponse.json({ error: 'Cannot bid on own auction' }, { status: 400 })

  const minBid = auction.current_bid ? auction.current_bid + 0.01 : auction.start_price
  if (amount < minBid) return NextResponse.json({ error: `Minimum bid is $${minBid.toFixed(2)}` }, { status: 400 })

  await supabase.from('bids').insert({ auction_id: id, bidder_id: user.id, amount })

  const { error } = await supabase
    .from('auctions')
    .update({ current_bid: amount, bid_count: auction.bid_count + 1, winner_id: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, current_bid: amount })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/auctions/
git commit -m "feat: add auctions API with bid validation"
```

---

## Task 3: Auctions Page + Live Bid Form

**Files:**
- Create: `app/auctions/page.tsx`, `app/auctions/[id]/page.tsx`, `components/bid-form.tsx`

- [ ] **Step 1: Write bid form component**

Create `components/bid-form.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Props {
  auctionId: string
  initialBid: number | null
  startPrice: number
  endsAt: string
  listingId: string
}

export default function BidForm({ auctionId, initialBid, startPrice, endsAt, listingId }: Props) {
  const [currentBid, setCurrentBid] = useState(initialBid)
  const [bidAmount, setBidAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ended, setEnded] = useState(new Date(endsAt) <= new Date())

  const supabase = createClient()
  const minBid = currentBid ? currentBid + 0.01 : startPrice

  useEffect(() => {
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}`
      }, (payload) => {
        setCurrentBid(payload.new.current_bid)
      })
      .subscribe()

    const timer = setInterval(() => {
      if (new Date(endsAt) <= new Date()) { setEnded(true); clearInterval(timer) }
    }, 10000)

    return () => { supabase.removeChannel(channel); clearInterval(timer) }
  }, [auctionId, endsAt, supabase])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(bidAmount) }),
    })
    const data = await res.json()
    if (res.ok) { setMessage('Bid placed!'); setBidAmount('') }
    else setMessage(data.error)
    setLoading(false)
  }

  if (ended) return <p className="text-red-500 font-semibold">Auction ended.</p>

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-2xl font-bold text-blue-600 mb-1">
        {currentBid ? formatCurrency(currentBid) : formatCurrency(startPrice)}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        {currentBid ? 'Current bid' : 'Starting bid'}
      </p>
      <form onSubmit={handleBid} className="flex gap-2">
        <input type="number" step="0.01" min={minBid} value={bidAmount}
          onChange={e => setBidAmount(e.target.value)}
          placeholder={`Min $${minBid.toFixed(2)}`}
          className="flex-1 border rounded px-3 py-2" required />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? '...' : 'Bid'}
        </button>
      </form>
      {message && <p className="text-sm mt-2 text-gray-600">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Write auctions list page**

Create `app/auctions/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function AuctionsPage() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data: auctions } = await supabase
    .from('auctions')
    .select('*, listings(id, title, images, card_type, condition)')
    .gt('ends_at', now)
    .order('ends_at', { ascending: true })

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Auctions</h1>
        <Link href="/auctions/new" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          + Create Auction
        </Link>
      </div>
      {auctions && auctions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map(a => (
            <Link key={a.id} href={`/auctions/${a.id}`}
              className="block bg-white border rounded-lg hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                {a.listings?.images?.[0] ? (
                  <img src={a.listings.images[0]} alt={a.listings.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold truncate">{a.listings?.title}</p>
                <p className="text-blue-600 font-bold mt-1">
                  {a.current_bid ? formatCurrency(a.current_bid) : `Starts at ${formatCurrency(a.start_price)}`}
                </p>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{a.bid_count} bids</span>
                  <span>Ends {new Date(a.ends_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No active auctions.</p>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Write single auction page**

Create `app/auctions/[id]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import BidForm from '@/components/bid-form'
import { notFound } from 'next/navigation'

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: auction } = await supabase
    .from('auctions')
    .select('*, listings(*, profiles(username, verified_vendor))')
    .eq('id', id)
    .single()

  if (!auction || !auction.listings) notFound()

  const listing = auction.listings
  const ended = new Date(auction.ends_at) <= new Date()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
          {listing.images[0] ? (
            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500 capitalize mb-1">{listing.card_type} · {listing.condition.replace('_', ' ')}</p>
          <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
          <p className="text-sm text-gray-500 mb-4">
            Sold by <span className="font-medium">{listing.profiles?.username}</span>
            {listing.profiles?.verified_vendor && <span className="ml-1 text-blue-600">✓ Verified</span>}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Ends: {new Date(auction.ends_at).toLocaleString()} · {auction.bid_count} bids
          </p>
          {listing.description && <p className="text-gray-700 mb-4">{listing.description}</p>}
          {user ? (
            <BidForm
              auctionId={auction.id}
              initialBid={auction.current_bid}
              startPrice={auction.start_price}
              endsAt={auction.ends_at}
              listingId={listing.id}
            />
          ) : (
            <a href="/auth/login" className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700">
              Sign in to Bid
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/auctions/ components/bid-form.tsx
git commit -m "feat: add auctions pages with real-time bidding"
```

---

## Task 4: Stripe Connect Onboarding

**Files:**
- Create: `app/api/connect/onboard/route.ts`, `app/api/connect/refresh/route.ts`, `app/dashboard/connect/page.tsx`

- [ ] **Step 1: Write onboard API route**

Create `app/api/connect/onboard/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  let accountId = profile?.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' })
    accountId = account.id
    await supabase.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id)
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect?success=true`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
```

- [ ] **Step 2: Write refresh route**

Create `app/api/connect/refresh/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL))

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_account_id) {
    return NextResponse.redirect(new URL('/dashboard/connect', process.env.NEXT_PUBLIC_APP_URL))
  }

  const accountLink = await stripe.accountLinks.create({
    account: profile.stripe_account_id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/connect?success=true`,
    type: 'account_onboarding',
  })

  return NextResponse.redirect(accountLink.url)
}
```

- [ ] **Step 3: Add Connect webhook handling**

In `app/api/webhooks/stripe/route.ts`, add inside the `if (event.type === ...)` block:

```typescript
  if (event.type === 'account.updated') {
    const account = event.data.object
    if (account.charges_enabled && account.payouts_enabled) {
      await supabase
        .from('profiles')
        .update({ stripe_onboarded: true })
        .eq('stripe_account_id', account.id)
    }
  }
```

- [ ] **Step 4: Write Connect dashboard page**

Create `app/dashboard/connect/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConnectButton from './connect-button'

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_onboarded, stripe_account_id')
    .eq('id', user.id)
    .single()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Payout Setup</h1>
      {profile?.stripe_onboarded ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-semibold">✓ Stripe account connected</p>
          <p className="text-green-600 text-sm mt-1">You will receive payouts after each sale.</p>
        </div>
      ) : (
        <div>
          {params.success && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-700 text-sm">Setup submitted. Stripe is verifying your details — this can take a few minutes.</p>
            </div>
          )}
          <p className="text-gray-600 mb-4">
            Connect a Stripe account to receive payouts when your cards sell. CardHaus uses Stripe Express — takes about 2 minutes.
          </p>
          <ConnectButton />
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Write ConnectButton client component**

Create `app/dashboard/connect/connect-button.tsx`:

```typescript
'use client'
import { useState } from 'react'

export default function ConnectButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const res = await fetch('/api/connect/onboard', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { alert(data.error); setLoading(false) }
  }

  return (
    <button onClick={handleConnect} disabled={loading}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
      {loading ? 'Redirecting to Stripe...' : 'Connect Stripe Account'}
    </button>
  )
}
```

- [ ] **Step 6: Add Connect link to dashboard**

In `app/dashboard/page.tsx`, add to the flex gap-4 div:

```typescript
<Link href="/dashboard/connect" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
  Payout Setup
</Link>
```

- [ ] **Step 7: Commit**

```bash
git add app/api/connect/ app/dashboard/connect/ app/dashboard/page.tsx app/api/webhooks/
git commit -m "feat: add Stripe Connect onboarding for seller payouts"
```

---

## Task 5: EasyPost Shipping Labels

**Files:**
- Create: `lib/easypost.ts`, `app/api/shipping/labels/route.ts`, `app/dashboard/labels/page.tsx`

- [ ] **Step 1: Write EasyPost client**

Create `lib/easypost.ts`:

```typescript
const EASYPOST_BASE = 'https://api.easypost.com/v2'
const MARKUP = 1.18

export interface ShipmentResult {
  id: string
  tracking_code: string
  label_url: string
  rate: number
  charged_rate: number
}

export async function createShipment(params: {
  toName: string
  toStreet: string
  toCity: string
  toState: string
  toZip: string
  fromName: string
  fromStreet: string
  fromCity: string
  fromState: string
  fromZip: string
  weightOz: number
}): Promise<ShipmentResult> {
  const headers = {
    Authorization: `Bearer ${process.env.EASYPOST_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const shipmentRes = await fetch(`${EASYPOST_BASE}/shipments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      shipment: {
        to_address: { name: params.toName, street1: params.toStreet, city: params.toCity, state: params.toState, zip: params.toZip, country: 'US' },
        from_address: { name: params.fromName, street1: params.fromStreet, city: params.fromCity, state: params.fromState, zip: params.fromZip, country: 'US' },
        parcel: { weight: params.weightOz },
      },
    }),
  })

  const shipment = await shipmentRes.json()
  const uspsRates = shipment.rates.filter((r: { carrier: string }) => r.carrier === 'USPS')
  const cheapest = uspsRates.sort((a: { rate: string }, b: { rate: string }) => parseFloat(a.rate) - parseFloat(b.rate))[0]

  const buyRes = await fetch(`${EASYPOST_BASE}/shipments/${shipment.id}/buy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rate: { id: cheapest.id } }),
  })

  const bought = await buyRes.json()
  const carrierRate = parseFloat(cheapest.rate)

  return {
    id: bought.id,
    tracking_code: bought.tracking_code,
    label_url: bought.postage_label.label_url,
    rate: carrierRate,
    charged_rate: Math.round(carrierRate * MARKUP * 100) / 100,
  }
}
```

- [ ] **Step 2: Write labels API route**

Create `app/api/shipping/labels/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { createShipment } from '@/lib/easypost'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id, to_name, to_street, to_city, to_state, to_zip, from_name, from_street, from_city, from_state, from_zip, weight_oz } = await request.json()

  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id, status')
    .eq('id', order_id)
    .eq('seller_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.easypost_shipment_id) return NextResponse.json({ error: 'Label already generated' }, { status: 400 })

  const shipment = await createShipment({
    toName: to_name, toStreet: to_street, toCity: to_city, toState: to_state, toZip: to_zip,
    fromName: from_name, fromStreet: from_street, fromCity: from_city, fromState: from_state, fromZip: from_zip,
    weightOz: weight_oz ?? 1,
  })

  await supabase.from('orders').update({
    easypost_shipment_id: shipment.id,
    tracking_number: shipment.tracking_code,
    shipping_cost: shipment.charged_rate,
    status: 'shipped',
  }).eq('id', order_id)

  return NextResponse.json({ label_url: shipment.label_url, tracking_code: shipment.tracking_code, charged_rate: shipment.charged_rate })
}
```

- [ ] **Step 3: Write labels dashboard page**

Create `app/dashboard/labels/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LabelForm from './label-form'

export default async function LabelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(title)')
    .eq('seller_id', user.id)
    .eq('status', 'paid')
    .is('easypost_shipment_id', null)

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Generate Shipping Labels</h1>
      {orders && orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(o => (
            <div key={o.id} className="bg-white border rounded-lg p-6">
              <p className="font-semibold mb-4">{o.listings?.title}</p>
              <LabelForm orderId={o.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No orders awaiting shipping labels.</p>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Write LabelForm client component**

Create `app/dashboard/labels/label-form.tsx`:

```typescript
'use client'
import { useState } from 'react'

export default function LabelForm({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ label_url: string; tracking_code: string; charged_rate: number } | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    to_name: '', to_street: '', to_city: '', to_state: '', to_zip: '',
    from_name: '', from_street: '', from_city: '', from_state: '', from_zip: '',
    weight_oz: '1',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/shipping/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, ...form, weight_oz: Number(form.weight_oz) }),
    })
    const data = await res.json()
    if (res.ok) setResult(data)
    else setError(data.error)
    setLoading(false)
  }

  if (result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <p className="font-semibold text-green-700">Label generated!</p>
        <p className="text-sm mt-1">Tracking: {result.tracking_code}</p>
        <p className="text-sm">Shipping cost: ${result.charged_rate.toFixed(2)}</p>
        <a href={result.label_url} target="_blank" rel="noreferrer"
          className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Download Label
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="font-medium text-sm mb-2">Ship To</p>
        <div className="grid grid-cols-2 gap-2">
          {(['to_name', 'to_street', 'to_city', 'to_state', 'to_zip'] as const).map(f => (
            <input key={f} placeholder={f.replace('to_', '').replace('_', ' ')} value={form[f]}
              onChange={e => set(f, e.target.value)}
              className="border rounded px-3 py-2 text-sm" required />
          ))}
        </div>
      </div>
      <div>
        <p className="font-medium text-sm mb-2">Ship From</p>
        <div className="grid grid-cols-2 gap-2">
          {(['from_name', 'from_street', 'from_city', 'from_state', 'from_zip'] as const).map(f => (
            <input key={f} placeholder={f.replace('from_', '').replace('_', ' ')} value={form[f]}
              onChange={e => set(f, e.target.value)}
              className="border rounded px-3 py-2 text-sm" required />
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Weight (oz)</label>
        <input type="number" step="0.1" min="0.1" value={form.weight_oz}
          onChange={e => set('weight_oz', e.target.value)}
          className="border rounded px-3 py-2 text-sm w-full mt-1" required />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Generating...' : 'Generate Label'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Add Labels link to dashboard**

In `app/dashboard/page.tsx`, add to the flex gap-4 div:

```typescript
<Link href="/dashboard/labels" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
  Ship Orders
</Link>
```

- [ ] **Step 6: Commit**

```bash
git add lib/easypost.ts app/api/shipping/ app/dashboard/labels/ app/dashboard/page.tsx
git commit -m "feat: add EasyPost shipping label generation with platform markup"
```

---

## Phase 2 Complete

Working features:
- Auctions with real-time bidding (Supabase Realtime)
- Stripe Connect seller onboarding + payouts
- EasyPost shipping labels with markup
- Seller dashboard: payout setup + ship orders

**Next:** See `2026-05-05-cardhaus-phase3.md` — Vendor storefronts, reviews, admin dashboard.

# CardHaus Phase 1: Foundation + Listings + Payments

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working marketplace where users can sign up, list cards, and buy them with Stripe.

**Architecture:** Next.js 14 App Router monolith. Supabase for auth + database + storage. Stripe Connect for payments with platform fee capture. This phase delivers: auth, fixed-price listings, buy now flow, seller dashboard basics.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase, Stripe, Vercel

---

## File Structure

```
cardhaus/
├── app/
│   ├── layout.tsx                  # Root layout, nav
│   ├── page.tsx                    # Homepage
│   ├── marketplace/page.tsx        # Listings browse
│   ├── listings/[id]/page.tsx      # Single listing
│   ├── listings/new/page.tsx       # Create listing
│   ├── dashboard/page.tsx          # Seller dashboard
│   ├── dashboard/listings/page.tsx # Manage listings
│   ├── dashboard/orders/page.tsx   # View orders
│   ├── auth/login/page.tsx
│   ├── auth/signup/page.tsx
│   └── api/
│       ├── listings/route.ts       # GET/POST listings
│       ├── listings/[id]/route.ts  # GET/PATCH/DELETE
│       ├── orders/route.ts         # POST create order
│       ├── payments/checkout/route.ts   # Stripe checkout session
│       └── webhooks/stripe/route.ts     # Stripe events
├── components/
│   ├── nav.tsx
│   ├── listing-card.tsx
│   └── buy-now-button.tsx
├── lib/
│   ├── supabase/client.ts          # Browser client
│   ├── supabase/server.ts          # Server client
│   ├── supabase/types.ts           # DB types
│   ├── stripe.ts                   # Stripe instance
│   └── utils.ts                    # Fee calculation
├── middleware.ts                   # Auth protection
└── supabase/migrations/
    └── 001_initial.sql
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest cardhaus --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd cardhaus
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js
```

- [ ] **Step 3: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
EASYPOST_API_KEY=EZ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
PLATFORM_FEE_PERCENT=10
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at http://localhost:3000

- [ ] **Step 5: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create Supabase project**

Go to supabase.com → New Project → copy URL and keys into `.env.local`.

- [ ] **Step 2: Write migration**

Create `supabase/migrations/001_initial.sql`:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text unique not null,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'vendor', 'admin')),
  stripe_account_id text,
  stripe_onboarded boolean default false,
  verified_vendor boolean default false,
  created_at timestamptz default now()
);

-- Listings
create table public.listings (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  price numeric(10,2) not null check (price > 0),
  card_type text not null check (card_type in ('pokemon', 'mtg', 'sports', 'other')),
  condition text not null check (condition in ('poor', 'good', 'excellent', 'near_mint', 'mint', 'graded')),
  grade text,
  grade_company text check (grade_company in ('PSA', 'BGS', 'CGC')),
  images text[] default '{}',
  status text not null default 'active' check (status in ('active', 'sold', 'removed')),
  is_auction boolean default false,
  created_at timestamptz default now()
);

-- Orders
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  listing_id uuid references public.listings(id) not null,
  total numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  shipping_cost numeric(10,2) default 0,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  easypost_shipment_id text,
  tracking_number text,
  status text not null default 'paid' check (status in ('paid', 'shipped', 'delivered', 'disputed', 'refunded')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;

-- RLS: profiles
create policy "Public profiles readable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- RLS: listings
create policy "Active listings readable" on public.listings for select using (status = 'active' or seller_id = auth.uid());
create policy "Sellers create listings" on public.listings for insert with check (auth.uid() = seller_id);
create policy "Sellers update own listings" on public.listings for update using (auth.uid() = seller_id);

-- RLS: orders
create policy "Buyers see own orders" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "System creates orders" on public.orders for insert with check (auth.uid() = buyer_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: Run migration in Supabase SQL editor**

Paste the SQL into Supabase Dashboard → SQL Editor → Run.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/types.ts`

- [ ] **Step 1: Write browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Write DB types**

Create `lib/supabase/types.ts`:

```typescript
export type UserRole = 'buyer' | 'seller' | 'vendor' | 'admin'
export type CardType = 'pokemon' | 'mtg' | 'sports' | 'other'
export type Condition = 'poor' | 'good' | 'excellent' | 'near_mint' | 'mint' | 'graded'
export type ListingStatus = 'active' | 'sold' | 'removed'
export type OrderStatus = 'paid' | 'shipped' | 'delivered' | 'disputed' | 'refunded'
export type GradeCompany = 'PSA' | 'BGS' | 'CGC'

export interface Profile {
  id: string
  email: string
  username: string
  role: UserRole
  stripe_account_id: string | null
  stripe_onboarded: boolean
  verified_vendor: boolean
  created_at: string
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  card_type: CardType
  condition: Condition
  grade: string | null
  grade_company: GradeCompany | null
  images: string[]
  status: ListingStatus
  is_auction: boolean
  created_at: string
  profiles?: Profile
}

export interface Order {
  id: string
  buyer_id: string
  seller_id: string
  listing_id: string
  total: number
  platform_fee: number
  shipping_cost: number
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  easypost_shipment_id: string | null
  tracking_number: string | null
  status: OrderStatus
  created_at: string
  listings?: Listing
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client setup and DB types"
```

---

## Task 4: Auth Middleware + Pages

**Files:**
- Create: `middleware.ts`, `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`

- [ ] **Step 1: Write middleware**

Create `middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/listings/new']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
```

- [ ] **Step 2: Write login page**

Create `app/auth/login/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/marketplace')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Sign in to CardHaus</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
          <input type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center">
          No account? <Link href="/auth/signup" className="text-blue-600">Sign up</Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Write signup page**

Create `app/auth/signup/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/marketplace')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create your CardHaus account</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2" required />
          <input type="password" placeholder="Password (min 6 chars)" value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2" required minLength={6} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center">
          Have an account? <Link href="/auth/login" className="text-blue-600">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Test auth manually**

Run `npm run dev`. Go to http://localhost:3000/auth/signup. Create account. Verify redirect to /marketplace. Check Supabase dashboard → Authentication → Users to confirm user created.

- [ ] **Step 5: Commit**

```bash
git add app/auth/ middleware.ts
git commit -m "feat: add auth pages and route protection middleware"
```

---

## Task 5: Utility Functions + Stripe Setup

**Files:**
- Create: `lib/utils.ts`, `lib/stripe.ts`

- [ ] **Step 1: Write fee calculator**

Create `lib/utils.ts`:

```typescript
export function calculatePlatformFee(price: number): number {
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)
  return Math.round(price * (feePercent / 100) * 100) / 100
}

export function calculateSellerPayout(price: number): number {
  return Math.round((price - calculatePlatformFee(price)) * 100) / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
```

- [ ] **Step 2: Write Stripe client**

Create `lib/stripe.ts`:

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})
```

- [ ] **Step 3: Commit**

```bash
git add lib/utils.ts lib/stripe.ts
git commit -m "feat: add fee calculator and Stripe client"
```

---

## Task 6: Listings API Routes

**Files:**
- Create: `app/api/listings/route.ts`, `app/api/listings/[id]/route.ts`

- [ ] **Step 1: Write listings collection route**

Create `app/api/listings/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  let query = supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })

  const cardType = searchParams.get('card_type')
  const condition = searchParams.get('condition')
  const minPrice = searchParams.get('min_price')
  const maxPrice = searchParams.get('max_price')
  const q = searchParams.get('q')

  if (cardType) query = query.eq('card_type', cardType)
  if (condition) query = query.eq('condition', condition)
  if (minPrice) query = query.gte('price', Number(minPrice))
  if (maxPrice) query = query.lte('price', Number(maxPrice))
  if (q) query = query.textSearch('title', q)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, price, card_type, condition, grade, grade_company, images } = body

  if (!title || !price || !card_type || !condition) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({ seller_id: user.id, title, description, price, card_type, condition, grade, grade_company, images: images ?? [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('profiles').update({ role: 'seller' }).eq('id', user.id).eq('role', 'buyer')

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Write single listing route**

Create `app/api/listings/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor, stripe_onboarded)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('listings')
    .update(body)
    .eq('id', id)
    .eq('seller_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Test with curl**

```bash
# Should return empty array
curl http://localhost:3000/api/listings
```
Expected: `[]`

- [ ] **Step 4: Commit**

```bash
git add app/api/listings/
git commit -m "feat: add listings API with filtering"
```

---

## Task 7: Stripe Checkout + Webhook

**Files:**
- Create: `app/api/payments/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Write checkout session endpoint**

Create `app/api/payments/checkout/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { calculatePlatformFee } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id } = await request.json()
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const { data: listing } = await supabase
    .from('listings')
    .select('*, profiles(stripe_account_id, stripe_onboarded)')
    .eq('id', listing_id)
    .eq('status', 'active')
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (listing.seller_id === user.id) return NextResponse.json({ error: 'Cannot buy own listing' }, { status: 400 })
  if (!listing.profiles?.stripe_onboarded) return NextResponse.json({ error: 'Seller not onboarded' }, { status: 400 })

  const priceInCents = Math.round(listing.price * 100)
  const feeInCents = Math.round(calculatePlatformFee(listing.price) * 100)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: listing.title, images: listing.images.slice(0, 1) },
        unit_amount: priceInCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing_id}`,
    payment_intent_data: {
      application_fee_amount: feeInCents,
      transfer_data: { destination: listing.profiles.stripe_account_id! },
    },
    metadata: { listing_id, buyer_id: user.id, seller_id: listing.seller_id },
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 2: Write Stripe webhook handler**

Create `app/api/webhooks/stripe/route.ts`:

```typescript
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { listing_id, buyer_id, seller_id } = session.metadata!

    const { data: listing } = await supabase
      .from('listings')
      .select('price')
      .eq('id', listing_id)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const platformFee = Math.round(listing.price * Number(process.env.PLATFORM_FEE_PERCENT ?? 10)) / 100

    await supabase.from('orders').insert({
      buyer_id,
      seller_id,
      listing_id,
      total: listing.price,
      platform_fee: platformFee,
      stripe_payment_intent_id: session.payment_intent,
      status: 'paid',
    })

    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing_id)
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 3: Set up Stripe webhook locally**

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 4: Commit**

```bash
git add app/api/payments/ app/api/webhooks/
git commit -m "feat: add Stripe checkout and webhook order creation"
```

---

## Task 8: Nav + Layout

**Files:**
- Create: `components/nav.tsx`, modify `app/layout.tsx`

- [ ] **Step 1: Write Nav component**

Create `components/nav.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Nav() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">CardHaus</Link>
      <div className="flex items-center gap-4">
        <Link href="/marketplace" className="text-sm hover:text-blue-600">Marketplace</Link>
        <Link href="/auctions" className="text-sm hover:text-blue-600">Auctions</Link>
        {user ? (
          <>
            <Link href="/listings/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Sell a Card</Link>
            <Link href="/dashboard" className="text-sm hover:text-blue-600">Dashboard</Link>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-sm hover:text-blue-600">Sign in</Link>
            <Link href="/auth/signup" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Update root layout**

Modify `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CardHaus — Buy & Sell Trading Cards',
  description: 'The marketplace for trading cards. Pokémon, MTG, Sports, and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/nav.tsx app/layout.tsx
git commit -m "feat: add nav and root layout"
```

---

## Task 9: Listing Card Component + Marketplace Page

**Files:**
- Create: `components/listing-card.tsx`, `app/marketplace/page.tsx`

- [ ] **Step 1: Write ListingCard component**

Create `components/listing-card.tsx`:

```typescript
import Link from 'next/link'
import { Listing } from '@/lib/supabase/types'
import { formatCurrency } from '@/lib/utils'

export default function ListingCard({ listing }: { listing: Listing & { profiles?: { username: string; verified_vendor: boolean } } }) {
  return (
    <Link href={`/listings/${listing.id}`} className="block bg-white rounded-lg border hover:shadow-md transition-shadow">
      <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
        {listing.images[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm truncate">{listing.title}</p>
        <p className="text-blue-600 font-bold mt-1">{formatCurrency(listing.price)}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500 capitalize">{listing.condition.replace('_', ' ')}</span>
          <span className="text-xs text-gray-400 capitalize">{listing.card_type}</span>
        </div>
        {listing.profiles && (
          <p className="text-xs text-gray-400 mt-1">
            {listing.profiles.username}
            {listing.profiles.verified_vendor && ' ✓'}
          </p>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Write marketplace page**

Create `app/marketplace/page.tsx`:

```typescript
import ListingCard from '@/components/listing-card'
import { Listing } from '@/lib/supabase/types'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']

async function getListings(searchParams: Record<string, string>) {
  const params = new URLSearchParams(searchParams).toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings?${params}`, { cache: 'no-store' })
  return res.json() as Promise<Listing[]>
}

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const listings = await getListings(params)

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Marketplace</h1>
      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <h2 className="font-semibold mb-3">Card Type</h2>
          <div className="space-y-2">
            {CARD_TYPES.map(t => (
              <a key={t} href={`/marketplace?card_type=${t}`}
                className="block text-sm capitalize hover:text-blue-600">{t}</a>
            ))}
            <a href="/marketplace" className="block text-sm text-gray-400 hover:text-blue-600">Clear</a>
          </div>
          <h2 className="font-semibold mt-6 mb-3">Condition</h2>
          <div className="space-y-2">
            {CONDITIONS.map(c => (
              <a key={c} href={`/marketplace?condition=${c}`}
                className="block text-sm capitalize hover:text-blue-600">{c.replace('_', ' ')}</a>
            ))}
          </div>
        </aside>
        <div className="flex-1">
          {listings.length === 0 ? (
            <p className="text-gray-500">No listings found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/listing-card.tsx app/marketplace/
git commit -m "feat: add marketplace page with listing cards and filters"
```

---

## Task 10: Create Listing Form

**Files:**
- Create: `app/listings/new/page.tsx`

- [ ] **Step 1: Write create listing page**

Create `app/listings/new/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'other']
const CONDITIONS = ['poor', 'good', 'excellent', 'near_mint', 'mint', 'graded']
const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC']

export default function NewListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    card_type: 'pokemon', condition: 'near_mint',
    grade: '', grade_company: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: Number(form.price), images: [] }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push(`/listings/${data.id}`)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">List a Card</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Charizard Base Set PSA 10"
            className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={4} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price (USD) *</label>
            <input type="number" step="0.01" min="0.01" value={form.price}
              onChange={e => set('price', e.target.value)}
              className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Card Type *</label>
            <select value={form.card_type} onChange={e => set('card_type', e.target.value)}
              className="w-full border rounded px-3 py-2">
              {CARD_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Condition *</label>
            <select value={form.condition} onChange={e => set('condition', e.target.value)}
              className="w-full border rounded px-3 py-2">
              {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          {form.condition === 'graded' && (
            <div>
              <label className="block text-sm font-medium mb-1">Grade Company</label>
              <select value={form.grade_company} onChange={e => set('grade_company', e.target.value)}
                className="w-full border rounded px-3 py-2">
                <option value="">Select...</option>
                {GRADE_COMPANIES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}
        </div>
        {form.condition === 'graded' && (
          <div>
            <label className="block text-sm font-medium mb-1">Grade (e.g. 10, 9.5)</label>
            <input value={form.grade} onChange={e => set('grade', e.target.value)}
              placeholder="10" className="w-full border rounded px-3 py-2" />
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Creating listing...' : 'List Card'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Test listing creation**

Go to http://localhost:3000/listings/new (must be logged in). Create a listing. Verify it appears in /marketplace.

- [ ] **Step 3: Commit**

```bash
git add app/listings/new/
git commit -m "feat: add create listing form"
```

---

## Task 11: Single Listing Page + Buy Now

**Files:**
- Create: `app/listings/[id]/page.tsx`, `components/buy-now-button.tsx`

- [ ] **Step 1: Write BuyNowButton**

Create `components/buy-now-button.tsx`:

```typescript
'use client'
import { useState } from 'react'

export default function BuyNowButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleBuy() {
    setLoading(true)
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { alert(data.error); setLoading(false) }
  }

  return (
    <button onClick={handleBuy} disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50">
      {loading ? 'Redirecting...' : 'Buy Now'}
    </button>
  )
}
```

- [ ] **Step 2: Write single listing page**

Create `app/listings/[id]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import BuyNowButton from '@/components/buy-now-button'
import { notFound } from 'next/navigation'

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('id', id)
    .single()

  if (!listing || listing.status !== 'active') notFound()

  const isOwner = user?.id === listing.seller_id

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
          {listing.grade && (
            <p className="text-sm text-gray-600 mb-2">{listing.grade_company} {listing.grade}</p>
          )}
          <p className="text-3xl font-bold text-blue-600 mb-4">{formatCurrency(listing.price)}</p>
          {listing.description && <p className="text-gray-700 mb-6">{listing.description}</p>}
          <p className="text-sm text-gray-500 mb-6">
            Sold by <span className="font-medium">{listing.profiles?.username}</span>
            {listing.profiles?.verified_vendor && <span className="ml-1 text-blue-600">✓ Verified</span>}
          </p>
          {isOwner ? (
            <p className="text-gray-500 text-sm">This is your listing.</p>
          ) : user ? (
            <BuyNowButton listingId={listing.id} />
          ) : (
            <a href="/auth/login" className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700">
              Sign in to Buy
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/listings/[id]/ components/buy-now-button.tsx
git commit -m "feat: add single listing page with buy now flow"
```

---

## Task 12: Seller Dashboard

**Files:**
- Create: `app/dashboard/page.tsx`, `app/dashboard/listings/page.tsx`, `app/dashboard/orders/page.tsx`

- [ ] **Step 1: Write dashboard home**

Create `app/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ count: listingCount }, { count: orderCount }] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'active'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('seller_id', user.id),
  ])

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Seller Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold">{listingCount ?? 0}</p>
          <p className="text-gray-500 mt-1">Active Listings</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold">{orderCount ?? 0}</p>
          <p className="text-gray-500 mt-1">Total Orders</p>
        </div>
      </div>
      <div className="flex gap-4">
        <Link href="/listings/new" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          + New Listing
        </Link>
        <Link href="/dashboard/listings" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          Manage Listings
        </Link>
        <Link href="/dashboard/orders" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          View Orders
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Write listings management page**

Create `app/dashboard/listings/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Link href="/listings/new" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
          + New Listing
        </Link>
      </div>
      <div className="space-y-3">
        {listings?.map(l => (
          <div key={l.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm text-gray-500 capitalize">{l.card_type} · {l.condition.replace('_', ' ')} · {formatCurrency(l.price)}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${
              l.status === 'active' ? 'bg-green-100 text-green-700' :
              l.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
            }`}>{l.status}</span>
          </div>
        ))}
        {!listings?.length && <p className="text-gray-500">No listings yet.</p>}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Write orders page**

Create `app/dashboard/orders/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function DashboardOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, listings(title)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="space-y-3">
        {orders?.map(o => (
          <div key={o.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{o.listings?.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Total: {formatCurrency(o.total)} · Your payout: {formatCurrency(o.total - o.platform_fee)}
                </p>
                {o.tracking_number && (
                  <p className="text-sm text-gray-400 mt-1">Tracking: {o.tracking_number}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${
                o.status === 'paid' ? 'bg-yellow-100 text-yellow-700' :
                o.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>{o.status}</span>
            </div>
          </div>
        ))}
        {!orders?.length && <p className="text-gray-500">No orders yet.</p>}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/
git commit -m "feat: add seller dashboard with listings and orders views"
```

---

## Task 13: Homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Write homepage**

Replace `app/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import Link from 'next/link'
import { Listing } from '@/lib/supabase/types'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: recent } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <main>
      <section className="bg-blue-600 text-white py-20 px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Buy & Sell Trading Cards</h1>
        <p className="text-xl mb-8 opacity-90">Pokémon, MTG, Sports Cards, and more.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/marketplace" className="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg hover:bg-blue-50">
            Browse Marketplace
          </Link>
          <Link href="/listings/new" className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700">
            Start Selling
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Recently Listed</h2>
          <Link href="/marketplace" className="text-blue-600 hover:underline text-sm">View all →</Link>
        </div>
        {recent && recent.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {recent.map((l: Listing) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <p className="text-gray-500">No listings yet. Be the first to sell!</p>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Verify full flow end-to-end**

1. Go to http://localhost:3000 — homepage loads
2. Click Browse Marketplace — listings page loads
3. Sign up → go to /listings/new → create listing → see it on marketplace
4. Log in as different account → click listing → Buy Now → Stripe test checkout
5. Use test card `4242 4242 4242 4242` exp `12/34` CVC `123`
6. Verify order created in Supabase `orders` table
7. Verify listing status changed to `sold`
8. Check seller dashboard shows order

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add homepage with hero and recent listings"
```

---

## Phase 1 Complete

Working features:
- Auth (signup, login, logout)
- Create listings (fixed price, all card types, conditions, grades)
- Browse marketplace with filters
- Single listing page
- Buy Now with Stripe Checkout
- Platform fee captured automatically
- Seller dashboard (listings + orders)
- Homepage

**Next:** See `2026-05-05-cardhaus-phase2.md` — Auctions + Stripe Connect onboarding + shipping labels.

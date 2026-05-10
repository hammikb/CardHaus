# CardHaus Phase 3: Vendor Storefronts + Reviews + Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verified vendors get public storefronts. Buyers can leave reviews after delivery. Admins can approve vendors, manage disputes, and see revenue.

**Architecture:** Extends Phase 1+2. Storefront = public profile page scoped to vendor's active listings. Reviews gated behind completed orders (one review per order). Admin routes protected by role check server-side.

**Tech Stack:** Same as Phase 1+2. No new dependencies.

**Prerequisite:** Phase 1 and Phase 2 complete.

---

## File Structure (additions)

```
app/
├── sellers/[username]/page.tsx     # Vendor storefront
├── reviews/new/page.tsx            # Leave a review
└── admin/
    ├── page.tsx                    # Admin dashboard
    ├── vendors/page.tsx            # Vendor approval queue
    └── disputes/page.tsx           # Dispute management
supabase/migrations/
└── 003_storefronts_reviews.sql
```

---

## Task 1: Storefronts + Reviews Schema

**Files:**
- Create: `supabase/migrations/003_storefronts_reviews.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/003_storefronts_reviews.sql`:

```sql
create table public.storefronts (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references public.profiles(id) on delete cascade unique not null,
  shop_name text not null,
  banner_image text,
  description text,
  policies text,
  created_at timestamptz default now()
);

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references public.orders(id) on delete cascade unique not null,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);

alter table public.storefronts enable row level security;
alter table public.reviews enable row level security;

create policy "Storefronts readable" on public.storefronts for select using (true);
create policy "Vendors manage own storefront" on public.storefronts
  for all using (auth.uid() = vendor_id);

create policy "Reviews readable" on public.reviews for select using (true);
create policy "Buyers create reviews" on public.reviews
  for insert with check (auth.uid() = buyer_id);

-- Materialized review score update (simple avg via function)
create or replace function public.update_review_score()
returns trigger as $$
begin
  -- stored on profiles for fast query; update on insert
  return new;
end;
$$ language plpgsql;
```

- [ ] **Step 2: Run in Supabase SQL editor**

Paste into Supabase Dashboard → SQL Editor → Run.

- [ ] **Step 3: Add types to `lib/supabase/types.ts`**

Append to `lib/supabase/types.ts`:

```typescript
export interface Storefront {
  id: string
  vendor_id: string
  shop_name: string
  banner_image: string | null
  description: string | null
  policies: string | null
  created_at: string
}

export interface Review {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  rating: number
  body: string | null
  created_at: string
  profiles?: Pick<Profile, 'username'>
}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_storefronts_reviews.sql lib/supabase/types.ts
git commit -m "feat: add storefronts and reviews schema"
```

---

## Task 2: Vendor Storefront Page

**Files:**
- Create: `app/sellers/[username]/page.tsx`

- [ ] **Step 1: Write storefront page**

Create `app/sellers/[username]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/listing-card'
import { notFound } from 'next/navigation'

export default async function StorefrontPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, storefronts(*)')
    .eq('username', username)
    .single()

  if (!profile || !profile.verified_vendor) notFound()

  const { data: listings } = await supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('seller_id', profile.id)
    .eq('status', 'active')
    .eq('is_auction', false)
    .order('created_at', { ascending: false })

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(username)')
    .eq('seller_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null

  const storefront = profile.storefronts?.[0]

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {storefront?.banner_image && (
        <div className="h-48 bg-gray-200 rounded-lg overflow-hidden mb-6">
          <img src={storefront.banner_image} alt="Store banner" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{storefront?.shop_name ?? profile.username}</h1>
          <span className="text-blue-600 text-sm font-medium">✓ Verified Vendor</span>
        </div>
        {avgRating && (
          <p className="text-sm text-gray-500">{'★'.repeat(Math.round(avgRating))} {avgRating.toFixed(1)} ({reviews?.length} reviews)</p>
        )}
        {storefront?.description && <p className="text-gray-600 mt-2">{storefront.description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Listings ({listings?.length ?? 0})</h2>
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <p className="text-gray-500">No active listings.</p>
          )}
        </div>

        <div>
          {storefront?.policies && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Shop Policies</h2>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{storefront.policies}</p>
            </div>
          )}
          <h2 className="text-lg font-bold mb-3">Reviews</h2>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{r.profiles?.username}</span>
                    <span>{'★'.repeat(r.rating)}</span>
                  </div>
                  {r.body && <p className="text-sm text-gray-600">{r.body}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No reviews yet.</p>
          )}
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/sellers/
git commit -m "feat: add vendor storefront page with listings and reviews"
```

---

## Task 3: Review Submission

**Files:**
- Create: `app/api/reviews/route.ts`, `app/reviews/new/page.tsx`

- [ ] **Step 1: Write reviews API**

Create `app/api/reviews/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id, rating, body } = await request.json()

  if (!order_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'order_id and rating (1-5) required' }, { status: 400 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, status')
    .eq('id', order_id)
    .eq('buyer_id', user.id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status !== 'delivered') return NextResponse.json({ error: 'Order must be delivered before reviewing' }, { status: 400 })

  const { data, error } = await supabase
    .from('reviews')
    .insert({ order_id, buyer_id: user.id, seller_id: order.seller_id, rating, body })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already reviewed this order' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Write review page**

Create `app/reviews/new/page.tsx`:

```typescript
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'

function ReviewForm() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const router = useRouter()
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId) { setError('Missing order ID'); return }
    setLoading(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, rating, body }),
    })
    const data = await res.json()
    if (res.ok) router.push('/dashboard/orders')
    else { setError(data.error); setLoading(false) }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Leave a Review</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Comment (optional)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            rows={4} className="w-full border rounded px-3 py-2" />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </main>
  )
}

export default function ReviewPage() {
  return <Suspense><ReviewForm /></Suspense>
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/reviews/ app/reviews/
git commit -m "feat: add review submission gated behind delivered orders"
```

---

## Task 4: Admin Dashboard

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/vendors/page.tsx`, `app/admin/disputes/page.tsx`
- Create: `app/api/admin/vendors/[id]/route.ts`, `app/api/admin/disputes/[id]/route.ts`

- [ ] **Step 1: Write admin auth helper**

Add to `lib/utils.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')
  return { user, supabase }
}
```

- [ ] **Step 2: Write admin dashboard**

Create `app/admin/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPage() {
  const { supabase } = await requireAdmin()

  const [{ count: pendingVendors }, { count: openDisputes }, { data: revenueData }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller').eq('verified_vendor', false),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabase.from('orders').select('platform_fee').eq('status', 'delivered'),
  ])

  const totalRevenue = revenueData?.reduce((sum, o) => sum + o.platform_fee, 0) ?? 0

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold">${totalRevenue.toFixed(2)}</p>
          <p className="text-gray-500 mt-1">Platform Revenue</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold text-yellow-600">{pendingVendors ?? 0}</p>
          <p className="text-gray-500 mt-1">Vendor Applications</p>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <p className="text-3xl font-bold text-red-600">{openDisputes ?? 0}</p>
          <p className="text-gray-500 mt-1">Open Disputes</p>
        </div>
      </div>
      <div className="flex gap-4">
        <Link href="/admin/vendors" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          Review Vendor Applications
        </Link>
        <Link href="/admin/disputes" className="border px-4 py-2 rounded font-semibold hover:bg-gray-50">
          Manage Disputes
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Write vendor approval page**

Create `app/admin/vendors/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/utils'
import VendorActions from './vendor-actions'

export default async function AdminVendorsPage() {
  const { supabase } = await requireAdmin()

  const { data: applicants } = await supabase
    .from('profiles')
    .select('id, username, email, created_at')
    .eq('role', 'seller')
    .eq('verified_vendor', false)
    .order('created_at', { ascending: true })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vendor Applications</h1>
      {applicants && applicants.length > 0 ? (
        <div className="space-y-3">
          {applicants.map(a => (
            <div key={a.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{a.username}</p>
                <p className="text-sm text-gray-500">{a.email}</p>
              </div>
              <VendorActions sellerId={a.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No pending applications.</p>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Write VendorActions client component**

Create `app/admin/vendors/vendor-actions.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorActions({ sellerId }: { sellerId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle(action: 'approve' | 'reject') {
    setLoading(true)
    await fetch(`/api/admin/vendors/${sellerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handle('approve')} disabled={loading}
        className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
        Approve
      </button>
      <button onClick={() => handle('reject')} disabled={loading}
        className="border border-red-300 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50 disabled:opacity-50">
        Reject
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Write vendor approval API**

Create `app/api/admin/vendors/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getAdminSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await request.json()

  if (action === 'approve') {
    await supabase.from('profiles').update({ verified_vendor: true, role: 'vendor' }).eq('id', id)
    await supabase.from('storefronts').upsert({ vendor_id: id, shop_name: 'My Store' }, { onConflict: 'vendor_id' })
  } else if (action === 'reject') {
    await supabase.from('profiles').update({ role: 'seller' }).eq('id', id)
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Write disputes page**

Create `app/admin/disputes/page.tsx`:

```typescript
import { requireAdmin } from '@/lib/utils'
import DisputeActions from './dispute-actions'

export default async function AdminDisputesPage() {
  const { supabase } = await requireAdmin()

  const { data: disputes } = await supabase
    .from('orders')
    .select('*, listings(title), buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)')
    .eq('status', 'disputed')
    .order('created_at', { ascending: true })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Open Disputes</h1>
      {disputes && disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map(d => (
            <div key={d.id} className="bg-white border border-red-200 rounded-lg p-4">
              <p className="font-semibold">{d.listings?.title}</p>
              <p className="text-sm text-gray-500 mt-1">
                Buyer: {(d.buyer as { username?: string })?.username} · Seller: {(d.seller as { username?: string })?.username} · Total: ${d.total}
              </p>
              <DisputeActions orderId={d.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No open disputes.</p>
      )}
    </main>
  )
}
```

- [ ] **Step 7: Write DisputeActions client component**

Create `app/admin/disputes/dispute-actions.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DisputeActions({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle(resolution: 'refund' | 'release') {
    setLoading(true)
    await fetch(`/api/admin/disputes/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2 mt-3">
      <button onClick={() => handle('refund')} disabled={loading}
        className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50">
        Refund Buyer
      </button>
      <button onClick={() => handle('release')} disabled={loading}
        className="border px-3 py-1.5 rounded text-sm hover:bg-gray-50 disabled:opacity-50">
        Release to Seller
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Write disputes API**

Create `app/api/admin/disputes/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

async function getAdminSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { resolution } = await request.json()

  const { data: order } = await supabase
    .from('orders')
    .select('stripe_payment_intent_id, total')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  if (resolution === 'refund' && order.stripe_payment_intent_id) {
    await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', id)
  } else if (resolution === 'release') {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id)
  } else {
    return NextResponse.json({ error: 'Invalid resolution' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 9: Commit**

```bash
git add app/admin/ app/api/admin/ app/api/reviews/ app/reviews/ lib/utils.ts
git commit -m "feat: add admin dashboard with vendor approval and dispute resolution"
```

---

## Task 5: First Admin User Setup

- [ ] **Step 1: Set first admin in Supabase**

In Supabase SQL Editor, run (replace with your actual user ID from auth.users):

```sql
update public.profiles set role = 'admin' where email = 'your-email@example.com';
```

- [ ] **Step 2: Verify admin access**

Go to http://localhost:3000/admin while logged in as that user. Should see admin dashboard. Log in as non-admin and go to /admin — should redirect to /.

- [ ] **Step 3: Test vendor approval flow**

1. Sign up as a second user
2. Create a listing (becomes seller)
3. In admin panel, approve as vendor
4. Verify profile role = 'vendor', verified_vendor = true
5. Check storefront created at /sellers/[username]

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: add admin setup instructions to migration"
```

---

## Phase 3 Complete

Working features:
- Verified vendor storefronts with listings + reviews
- Review submission (gated: delivered orders, one per order)
- Admin dashboard: revenue overview, vendor approval, dispute resolution (refund or release)
- Admin role protected server-side on all routes

**All 3 phases done = full CardHaus MVP.**

Deploy checklist:
1. Push to GitHub
2. Connect repo to Vercel
3. Add all env vars in Vercel project settings
4. Set `NEXT_PUBLIC_APP_URL` to production URL
5. Add production Stripe webhook pointing to `https://yourdomain.com/api/webhooks/stripe`
6. Run all 3 SQL migrations in production Supabase project

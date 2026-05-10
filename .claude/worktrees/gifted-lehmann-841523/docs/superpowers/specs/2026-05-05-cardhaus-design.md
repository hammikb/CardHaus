# CardHaus — Trading Card Marketplace Design Spec
**Date:** 2026-05-05  
**Status:** Approved

---

## Overview

CardHaus is a peer-to-peer + vendor trading card marketplace. Supports all card types (Pokémon, MTG, sports, etc.). Casual sellers and verified vendors both sell. Revenue from transaction fees and shipping label markup. Built as a Next.js monolith on Vercel + Supabase + Stripe.

---

## Architecture

```
CardHaus (Next.js 14 App Router monolith on Vercel)
├── Frontend (React + Tailwind CSS)
├── API Routes (Next.js /api — business logic)
└── Integrations
    ├── Supabase (database + auth + file storage)
    ├── Stripe Connect (payments, seller payouts, fee capture)
    └── EasyPost (shipping label generation + margin)
```

### User Roles
- **Buyer** — browse, buy, bid, track orders
- **Casual Seller** — list cards, manage orders, print labels
- **Verified Vendor** — storefront page, bulk listing tools (approved by admin)
- **Admin** — approve vendors, manage disputes, view revenue dashboard

### Pages
| Route | Purpose |
|---|---|
| `/` | Homepage — featured cards, trending, ending soon |
| `/marketplace` | Fixed price listings with search + filter |
| `/auctions` | Live and upcoming auctions |
| `/sellers/[username]` | Vendor storefront page |
| `/dashboard` | Seller tools — listings, orders, payouts, labels |
| `/admin` | Platform management — vendors, disputes, revenue |

---

## Data Model (Supabase / Postgres)

```sql
users
  id, email, role (buyer/seller/vendor/admin)
  stripe_account_id, verified_vendor (boolean)

listings
  id, seller_id, title, description
  price, card_type, condition, grade (self-reported)
  images[], status (active/sold/removed)
  is_auction (boolean)

auctions
  listing_id, start_price, current_bid
  bid_count, ends_at, winner_id

orders
  id, buyer_id, seller_id, listing_id
  total, platform_fee, shipping_cost
  easypost_shipment_id, tracking_number
  status (paid/shipped/delivered/disputed)

storefronts
  vendor_id, shop_name, banner_image
  description, policies, review_score

reviews
  order_id, buyer_id, seller_id, rating, body
```

---

## Key Flows

### Buying (Fixed Price)
1. Buyer clicks Buy Now → Stripe Checkout opens
2. Platform captures full amount
3. Seller notified → generates shipping label via EasyPost dashboard
4. Seller ships, enters tracking → buyer notified
5. Order marked delivered → Stripe pays out seller minus platform fee

### Auction Flow
1. Seller creates auction — sets start price + end time
2. Buyers bid (Supabase real-time updates current bid live)
3. Auction ends → winner charged via Stripe
4. Same shipping flow as fixed price

### Seller Onboarding
1. Sign up → connect Stripe account (Stripe Connect Express)
2. Casual seller active immediately
3. Apply for Verified Vendor → admin approves → storefront unlocked

### Shipping Label Generation
1. Order paid → seller clicks "Generate Label" in dashboard
2. EasyPost creates label at carrier rate
3. Platform charges seller marked-up rate, keeps margin

---

## Shipping

Most cards ship via USPS as envelopes or bubble mailers. Label tiers:

| Size | Service | Est. Carrier Cost |
|---|---|---|
| Single card (envelope) | USPS First Class | $0.68–$1.50 |
| Small lot (bubble mailer) | USPS First Class | $1.50–$4.50 |
| Large lot (box) | USPS Priority Mail | $8.00+ |

Platform marks up EasyPost label cost by ~15–20%.

---

## Search & Discovery

**Filters:**
- Card type (Pokémon, MTG, Sports, Other)
- Condition (Raw: Poor/Good/Excellent/Near Mint/Mint; Graded: PSA/BGS/CGC 1–10)
- Price range
- Listing type (fixed price / auction)
- Verified vendor toggle
- Sort: newest, price low→high, ending soon

**Search:** Supabase full-text search on title + description.

**Homepage sections:** Featured (admin-curated), Recently Listed, Ending Soon, Top Vendors.

---

## Revenue Model

**Transaction fee:** 10% of sale price (competitive, configurable in admin).  
**Stripe fee:** 2.9% + $0.30 per transaction (unavoidable, factored into net).  
**Shipping label margin:** ~15–20% markup on EasyPost carrier rate.

### Example — $100 sale
```
Buyer pays:          $100.00
Stripe fee:           -$3.20
Platform fee (10%):  -$10.00
Seller receives:      $86.80

Label example:
EasyPost rate:         $3.00
Charged to seller:     $3.60
Platform margin:       $0.60
```

**Future:** Verified Vendor subscription tier with reduced transaction fee.

---

## Error Handling & Edge Cases

| Scenario | Resolution |
|---|---|
| Failed payment | Stripe handles retry; listing stays active until confirmed |
| Seller doesn't ship | Buyer opens dispute after X days; admin reviews; refund via Stripe |
| Auction winner no-pay | 24hr payment window; auto-cancel; second bidder offered item |
| Duplicate listings | No auto-detection at launch; admin removes flagged listings |
| Seller account banned | Active listings hidden; pending orders flagged for admin review |

---

## Tech Stack

| Layer | Tool | Cost |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Free |
| Hosting | Vercel | Free tier |
| Database + Auth + Storage | Supabase | Free tier |
| Payments + Payouts | Stripe Connect | 2.9% + $0.30/txn |
| Shipping Labels | EasyPost | Pay per label |
| Styling | Tailwind CSS | Free |
| Image Storage | Supabase Storage | Free (1GB) |

**Free until revenue arrives.** Scale path: Supabase Pro ($25/mo) + Vercel Pro ($20/mo) when needed.

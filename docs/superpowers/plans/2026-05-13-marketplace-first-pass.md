# Marketplace First Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the marketplace buyer/seller flow with richer card detail, live market context, seller quantity for singles, and quantity-aware checkout.

**Architecture:** Keep seller inventory in `listings`, add a market data service plus stored snapshots for fallback, and update checkout/webhooks so listings decrement quantity instead of immediately becoming sold.

**Tech Stack:** Next.js App Router, React 19, Supabase, Stripe, TypeScript

---

### Task 1: Add persistence for market snapshots and order quantity

**Files:**
- Create: `supabase/migrations/016_market_snapshots_and_order_quantity.sql`
- Modify: `lib/supabase/types.ts`

- [ ] Add schema support for repeated purchases on the same listing and stored market data.
- [ ] Reflect the new fields in local TypeScript types.

### Task 2: Add market-data normalization helpers and tests

**Files:**
- Create: `lib/market-data.ts`
- Create: `lib/market-data.test.ts`

- [ ] Write failing tests for source normalization, summary generation, and fallback handling.
- [ ] Implement the minimal helper logic to satisfy those tests.

### Task 3: Add market snapshot API and listing aggregation support

**Files:**
- Create: `app/api/cards/[cardId]/market/route.ts`
- Modify: `app/api/listings/route.ts`
- Modify: `app/api/cards/[cardId]/variants/route.ts`

- [ ] Add a route that fetches current market data, stores snapshots, and returns normalized results.
- [ ] Expand listing queries so marketplace/detail pages have enough related card and seller data.

### Task 4: Update quantity-aware checkout and fulfillment

**Files:**
- Create: `lib/checkout.ts`
- Create: `lib/checkout.test.ts`
- Modify: `app/api/payments/checkout/route.ts`
- Modify: `app/api/webhooks/stripe/route.ts`
- Modify: `app/orders/success/page.tsx`
- Modify: `components/buy-now-button.tsx`

- [ ] Add failing tests for quantity validation and stock transition rules.
- [ ] Update checkout to accept quantity and create accurate Stripe sessions.
- [ ] Update webhook fulfillment to decrement listing quantity and create orders correctly.

### Task 5: Upgrade seller listing forms and buyer-facing pages

**Files:**
- Modify: `app/listings/singles/new/page.tsx`
- Modify: `components/listing-card.tsx`
- Modify: `app/listings/[id]/page.tsx`
- Modify: `app/marketplace/page.tsx`

- [ ] Add single-card quantity input and validation.
- [ ] Show quantity, richer card details, and market context on buyer-facing pages.
- [ ] Keep the grouped seller table behavior while making it more informative.

### Task 6: Verify

**Files:**
- Modify: none

- [ ] Run targeted tests for the new helpers.
- [ ] Run lint.
- [ ] Run production build.

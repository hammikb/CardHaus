# Marketplace First Pass Design

**Scope**

Focused first pass on the CardHaus buyer/seller loop:
- richer marketplace and listing detail pages
- live external market pricing with graceful fallback
- seller quantity support for singles
- grouped seller inventory per card
- quantity-aware checkout and stock updates

**Goals**

- Make listing pages feel trustworthy and data-rich.
- Let sellers list multiple copies of the same single card.
- Let buyers see seller-by-seller inventory under one card.
- Show real market context from external sources as soon as possible.
- Preserve the current marketplace model instead of replacing it.

**Non-goals**

- Full-site redesign
- Broad CMS or admin refactor
- Complete multi-game market normalization beyond the sources already available in the repo

**Product Shape**

- `listings` remains the seller-owned inventory row.
- A single card detail page shows multiple seller offers underneath.
- Each seller offer shows price, condition, quantity, and seller trust signals.
- External market data shows live values when available and last-known values with timestamps when live data is unavailable.

**Architecture**

- Add a dedicated market data layer in `lib/` that fetches and normalizes external pricing.
- Store market snapshots in Supabase for trend and fallback behavior.
- Expand the checkout flow to support buyer-selected quantity.
- Reduce listing quantity on purchase and only mark a listing sold when stock reaches zero.

**Primary Surfaces**

- `app/marketplace/page.tsx`
- `app/listings/[id]/page.tsx`
- `app/listings/singles/new/page.tsx`
- `app/api/listings/route.ts`
- `app/api/payments/checkout/route.ts`
- `app/api/webhooks/stripe/route.ts`

**Data Changes**

- Add market snapshot storage.
- Add order quantity storage.
- Remove one-order-per-listing behavior so multi-quantity listings can sell repeatedly.

**Success Criteria**

- Singles can be listed with quantity greater than 1.
- Listing detail pages show seller quantity and richer card information.
- Buyers can buy more than one copy when stock allows.
- Successful checkout reduces listing inventory correctly.
- Listing pages show real external market data with freshness timestamps and fallback behavior.

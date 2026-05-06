# Phase 2 + Phase 3 Implementation Guide

## Prerequisites
1. Run SQL migrations in Supabase dashboard (see MIGRATION section)
2. Set env vars: STRIPE_SECRET_KEY, EASYPOST_API_KEY
3. npm install stripe (if not already installed)

## MIGRATION SECTION
Run these in Supabase > SQL Editor:

### File: supabase/migrations/002_auctions.sql
[Already committed - just run in Supabase dashboard]

### File: supabase/migrations/003_storefronts_reviews.sql
[Already committed - just run in Supabase dashboard]

---

## PHASE 2: Auctions + Stripe + Shipping

### app/api/auctions/route.ts
[See plan: 2026-05-05-cardhaus-phase2.md Task 2 Step 1]

### app/api/auctions/[id]/bid/route.ts
[See plan: 2026-05-05-cardhaus-phase2.md Task 2 Step 2]

### components/bid-form.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 3 Step 1]

### app/auctions/page.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 3 Step 2]

### app/auctions/[id]/page.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 3 Step 3]

### app/api/connect/onboard/route.ts
[See plan: 2026-05-05-cardhaus-phase2.md Task 4 Step 1]

### app/api/connect/refresh/route.ts
[See plan: 2026-05-05-cardhaus-phase2.md Task 4 Step 2]

### app/dashboard/connect/page.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 4 Step 4]

### app/dashboard/connect/connect-button.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 4 Step 5]

### lib/easypost.ts
[See plan: 2026-05-05-cardhaus-phase2.md Task 5 Step 1]

### app/api/shipping/labels/route.ts
[See plan: 2026-05-05-cardhaus-phase2.md Task 5 Step 2]

### app/dashboard/labels/page.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 5 Step 3]

### app/dashboard/labels/label-form.tsx
[See plan: 2026-05-05-cardhaus-phase2.md Task 5 Step 4]

---

## PHASE 3: Storefronts + Reviews + Admin

### app/sellers/[username]/page.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 2 Step 1]

### app/api/reviews/route.ts
[See plan: 2026-05-05-cardhaus-phase3.md Task 3 Step 1]

### app/reviews/new/page.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 3 Step 2]

### app/admin/page.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 2]

### app/admin/vendors/page.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 3]

### app/admin/vendors/vendor-actions.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 4]

### app/api/admin/vendors/[id]/route.ts
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 5]

### app/admin/disputes/page.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 6]

### app/admin/disputes/dispute-actions.tsx
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 7]

### app/api/admin/disputes/[id]/route.ts
[See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 8]

### lib/utils.ts (append)
Add requireAdmin() function [See plan: 2026-05-05-cardhaus-phase3.md Task 4 Step 1]

---

## NEXT STEPS
1. Copy each file from plans docs into your IDE
2. Run: npm run build
3. Run: npm run dev
4. Test: http://localhost:3000

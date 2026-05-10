# CardHaus UI Phase 1 — Foundation Implementation Plan

> **Goal:** Establish visual foundation with color system, form feedback, focus states, and empty state messaging. Creates baseline for Phase 2 marketplace trust signals.

**Architecture:** Bottom-up approach — CSS variables first → component refinements → page-level improvements. Each component tested in isolation before integration.

**Tech Stack:** Next.js, React, Tailwind CSS, TypeScript

---

## File Structure

**Files to modify:**
- `cardhaus/app/globals.css` — Color tokens, utility classes
- `cardhaus/components/button.tsx` — Focus rings, hover states (NEW - extract from inline)
- `cardhaus/components/input.tsx` — Form styling, focus states (NEW - extract from inline)
- `cardhaus/components/empty-state.tsx` — Reusable empty state (NEW)
- `cardhaus/app/marketplace/page.tsx` — Empty state + messaging
- `cardhaus/app/dashboard/page.tsx` — Empty state improvements
- `cardhaus/app/listings/new/page.tsx` — Form feedback states

---

## Task 1: Global Color Tokens & Utilities

**Files:**
- Modify: `cardhaus/app/globals.css`

- [ ] **Step 1: Add CSS color token variables**

```css
:root {
  /* Semantic colors */
  --color-primary: #2563EB;        /* Blue - trust, CTA */
  --color-primary-light: #DBEAFE;  /* Blue-100 */
  --color-primary-dark: #1D4ED8;   /* Blue-700 */
  
  --color-secondary: #E11D48;       /* Rose - energy */
  --color-secondary-light: #FDF2F8; /* Rose-50 */
  
  --color-accent: #10B981;          /* Green - success */
  --color-accent-light: #ECFDF5;    /* Green-50 */
  
  --color-background: #F8FAFC;      /* Slate-50 */
  --color-foreground: #0F172A;      /* Slate-900 */
  --color-muted: #E2E8F0;           /* Slate-200 */
  --color-border: #CBD5E1;          /* Slate-300 */
  --color-destructive: #DC2626;     /* Red-600 */
  --color-destructive-light: #FEE2E2;
  
  --color-ring: #2563EB;            /* Blue - focus ring */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0F172A;
    --color-foreground: #F1F5F9;
    --color-muted: #334155;
    --color-border: #475569;
  }
}
```

- [ ] **Step 2: Add focus ring utility**

```css
.focus-visible-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2;
}
```

- [ ] **Step 3: Add transition utility**

```css
.transition-smooth {
  @apply transition-all duration-150 ease-out;
}
```

- [ ] **Step 4: Run build to verify CSS compiles**

```bash
npm run build
```

Expected: Build succeeds, no CSS errors.

- [ ] **Step 5: Commit**

```bash
git add cardhaus/app/globals.css
git commit -m "feat: add global color tokens and focus/transition utilities

- Add semantic color variables (primary, secondary, accent, destructive)
- Add focus-visible-ring utility for keyboard navigation
- Add transition-smooth for consistent 150ms animations
"
```

---

## Task 2: Button Component Refinement

**Files:**
- Create: `cardhaus/components/button.tsx`
- Modify: All pages using inline button styling → import Button component

- [ ] **Step 1: Create Button component**

```tsx
'use client'
import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseClasses = 'font-bold transition-smooth focus-visible-ring cursor-pointer'
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-50',
    ghost: 'bg-transparent text-blue-600 hover:bg-blue-50 disabled:opacity-50',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }
  
  const roundedClasses = 'rounded-lg'
  
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${roundedClasses} ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
```

- [ ] **Step 2: Run build and verify no TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Test Button in browser**

Navigate to any page with buttons (e.g., /auth/login). Verify:
- Focus ring visible when tabbing
- Hover state smooth transition
- Disabled state opacity reduced
- Loading state shows "Loading..." text

- [ ] **Step 4: Commit**

```bash
git add cardhaus/components/button.tsx
git commit -m "feat: create Button component with focus ring and loading states

- Support primary, secondary, ghost variants
- Add focus ring on keyboard nav
- Show loading state with disabled button
- Smooth 150ms transitions on hover
"
```

---

## Task 3: Input Component with Focus States

**Files:**
- Create: `cardhaus/components/input.tsx`
- Modify: Auth pages and form pages to use Input component

- [ ] **Step 1: Create Input component**

```tsx
'use client'
import { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  icon?: ReactNode
}

export default function Input({
  label,
  helperText,
  error,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-slate-900">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          className={`w-full border rounded-lg px-4 py-2.5 transition-smooth focus-visible-ring placeholder-slate-400
            ${error 
              ? 'border-red-500 bg-red-50 text-red-900' 
              : 'border-slate-300 focus:border-blue-500'
            }
            ${icon ? 'pl-10' : ''}
            ${className}`}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build and test**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Test in browser**

Navigate to /auth/login or /listings/new. Verify:
- Focus ring visible when clicking/tabbing input
- Error state shows red border + bg
- Helper text displays below input
- Placeholder text visible when empty

- [ ] **Step 4: Commit**

```bash
git add cardhaus/components/input.tsx
git commit -m "feat: create Input component with error feedback and focus ring

- Support label, helper text, error states
- Red background + border for error display
- Focus ring on all inputs
- Helper text below input when no error
"
```

---

## Task 4: Empty State Component

**Files:**
- Create: `cardhaus/components/empty-state.tsx`

- [ ] **Step 1: Create EmptyState component**

```tsx
import { ReactNode } from 'react'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionText?: string
  actionHref?: string
  actionOnClick?: () => void
  icon?: ReactNode
}

export default function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  actionOnClick,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-5xl text-slate-300">{icon}</div>
      )}
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-sm">{description}</p>
      {actionText && (
        actionHref ? (
          <Link
            href={actionHref}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-smooth focus-visible-ring"
          >
            {actionText}
          </Link>
        ) : (
          <button
            onClick={actionOnClick}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-smooth focus-visible-ring"
          >
            {actionText}
          </button>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add cardhaus/components/empty-state.tsx
git commit -m "feat: create EmptyState component with messaging and CTA

- Reusable empty state with title, description, icon
- Optional CTA button with link or onClick handler
- Centered layout for marketplace, dashboard pages
"
```

---

## Task 5: Form Feedback States (Loading, Success, Error)

**Files:**
- Modify: `cardhaus/app/auth/signup/page.tsx`
- Modify: `cardhaus/app/auth/login/page.tsx`
- Modify: `cardhaus/app/listings/new/page.tsx`

- [ ] **Step 1: Update signup page with feedback states**

In `handleSignup()`, update to show success state:

```tsx
async function handleSignup(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError('')
  
  const { error } = await supabase.auth.signUp({ email, password })
  
  if (error) {
    setError(error.message)
    setLoading(false)
    return
  }
  
  // Success state
  setLoading(false)
  // Show success message + redirect in 1s
  alert('Account created! Redirecting...')
  setTimeout(() => {
    router.push('/marketplace')
    router.refresh()
  }, 1000)
}
```

Add success message JSX before submit button:

```tsx
{error && <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
```

- [ ] **Step 2: Test signup form**

Open /auth/signup in browser. Test:
- Submit with invalid email → Error message appears below form
- Submit with valid email → Button shows "Creating account..." (disabled)
- After submission: Alert shows, redirects to marketplace

- [ ] **Step 3: Repeat for login and new listing pages**

Apply same pattern: show error near field, disable button during submit, show success feedback.

- [ ] **Step 4: Commit**

```bash
git add cardhaus/app/auth/signup/page.tsx cardhaus/app/auth/login/page.tsx cardhaus/app/listings/new/page.tsx
git commit -m "feat: add form feedback states (loading, error, success)

- Show loading state on button during submission
- Display error messages near submit area
- Add success feedback before redirect
- Disable form submission while loading
"
```

---

## Task 6: Marketplace Empty State

**Files:**
- Modify: `cardhaus/app/marketplace/page.tsx`

- [ ] **Step 1: Add EmptyState when no listings**

Find where listings render. Wrap with empty state:

```tsx
{listings && listings.length > 0 ? (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {/* render listings */}
  </div>
) : (
  <EmptyState
    title="No listings yet"
    description="Start selling your first card to see it appear here. Explore existing listings or list your first card."
    actionText="List Your First Card"
    actionHref="/listings/new"
    icon="📭"
  />
)}
```

- [ ] **Step 2: Build and test**

```bash
npm run build && npm run dev
```

Navigate to /marketplace. If no listings in DB, empty state should display.

- [ ] **Step 3: Commit**

```bash
git add cardhaus/app/marketplace/page.tsx
git commit -m "feat: add EmptyState to marketplace when no listings

- Show friendly message + CTA to list first card
- Replace empty grid with actionable guidance
"
```

---

## Task 7: Dashboard Empty State

**Files:**
- Modify: `cardhaus/app/dashboard/listings/page.tsx`
- Modify: `cardhaus/app/dashboard/orders/page.tsx`

- [ ] **Step 1: Add empty states for listings and orders**

In listings page:

```tsx
{listings && listings.length > 0 ? (
  /* render listings */
) : (
  <EmptyState
    title="No listings yet"
    description="Start by creating your first listing. You can add photos, set a price, and reach buyers immediately."
    actionText="Create First Listing"
    actionHref="/listings/new"
    icon="🎯"
  />
)}
```

In orders page:

```tsx
{orders && orders.length > 0 ? (
  /* render orders */
) : (
  <EmptyState
    title="No orders yet"
    description="Once you make your first purchase, it will appear here. Browse the marketplace to find cards."
    actionText="Browse Marketplace"
    actionHref="/marketplace"
    icon="📦"
  />
)}
```

- [ ] **Step 2: Build and test**

```bash
npm run build && npm run dev
```

Navigate to /dashboard/listings and /dashboard/orders when user has no data.

- [ ] **Step 3: Commit**

```bash
git add cardhaus/app/dashboard/listings/page.tsx cardhaus/app/dashboard/orders/page.tsx
git commit -m "feat: add EmptyState to dashboard pages

- Empty listings: CTA to create first listing
- Empty orders: CTA to browse marketplace
- Friendly messaging + icons
"
```

---

## Task 8: Testing & Verification

- [ ] **Step 1: Visual regression check**

Navigate through all pages in browser:
- `/` (homepage) — Button styles, CTA buttons visible
- `/auth/login` — Focus ring on inputs, error feedback works
- `/auth/signup` — Same as login
- `/marketplace` — Empty state if no listings
- `/listings/new` — Form inputs styled, submit feedback works
- `/dashboard` — Empty states visible

- [ ] **Step 2: Keyboard navigation test**

Tab through /auth/login page. Verify:
- Focus ring visible on each input
- Tab order logical (email → password → submit)
- Button receives focus when tabbed

- [ ] **Step 3: Mobile responsive test**

Open any page on 375px viewport. Verify:
- No horizontal scroll
- Buttons tap targets ≥44px
- Inputs readable, touch-friendly

- [ ] **Step 4: Commit completion**

```bash
git add -A
git commit -m "test: verify Phase 1 UI foundation across all pages

- Tested focus rings on keyboard navigation
- Verified form feedback states (error, loading, success)
- Confirmed empty states on marketplace and dashboard
- Mobile responsive at 375px, 768px, 1024px
"
```

---

## Success Criteria

Phase 1 complete when:
- ✅ All buttons use Button component with focus ring + hover states
- ✅ All inputs use Input component with error feedback + focus ring
- ✅ Empty states display on marketplace, dashboard when no data
- ✅ Form submission shows loading state + error/success feedback
- ✅ Keyboard navigation works (tab, focus visible)
- ✅ Mobile tested at 375px (no horizontal scroll, ≥44px touch targets)
- ✅ All changes committed atomically

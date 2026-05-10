# CardHaus Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize CardHaus for speed and perceived performance across all pages by replacing base64 images with Supabase Storage, migrating to Next.js Image component, configuring font optimization, adding code splitting, implementing skeleton screens, and adding debouncing—without reducing visual quality or functionality.

**Architecture:** Five phases targeting different performance layers: (1) font-display swap to prevent FOIT, (2) next.config.js setup + Next.js Image migration to enable WebP/AVIF and lazy loading, (3) Supabase Storage for true asset management, (4) dynamic imports + Suspense for code splitting, (5) debouncing and animation micro-optimizations.

**Tech Stack:** Next.js 16.2.4 with App Router, React 19.2.4, Supabase (with Storage), Tailwind CSS v4, TypeScript.

---

## Files to Create/Modify

**Create:**
- `lib/supabase/storage.ts` — Supabase Storage upload utility
- `components/skeleton-card.tsx` — Skeleton loader for listing cards
- `lib/utils/debounce.ts` — Debounce utility function

**Modify:**
- `app/layout.tsx` — Add font-display swap to Inter
- `next.config.ts` — Image optimization config
- `app/page.tsx` — Replace img with Image, add Suspense
- `components/listing-card.tsx` — Replace img with Image, add width/height
- `components/photo-upload.tsx` — Upload to Supabase Storage instead of base64
- `app/api/listings/route.ts` — Accept storage URLs instead of base64
- `app/listings/singles/new/page.tsx` — Work with new photo-upload interface
- `app/listings/graded/new/page.tsx` — Work with new photo-upload interface
- `app/listings/sealed/new/page.tsx` — Work with new photo-upload interface
- `app/listings/auction/new/page.tsx` — Work with new photo-upload interface
- `app/marketplace/page.tsx` — Add dynamic imports, Suspense, debounce
- `components/nav.tsx` — Add debounce to search

---

## Phase 1: Font Optimization

### Task 1: Configure Inter Font with font-display Swap

**Files:**
- Modify: `app/layout.tsx:1-20`

Prevent FOIT (Flash of Invisible Text) by using font-display swap. Browser immediately shows fallback font, swaps to Inter when loaded.

- [ ] **Step 1: Update Inter font config in app/layout.tsx**

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "perf: add font-display swap to Inter font to prevent FOIT"
```

---

## Phase 2: Image Optimization Config & Migration

### Task 2: Setup next.config.ts for Image Optimization

**Files:**
- Modify: `next.config.ts`

Configure Next.js to optimize images automatically: WebP/AVIF conversion, responsive sizes, caching headers.

- [ ] **Step 1: Replace next.config.ts with image optimization**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    deviceSizes: [375, 768, 1024, 1440],
    imageSizes: [16, 32, 64, 128, 256, 512],
    cacheControl: 'public, max-age=31536000, immutable',
  },
  compress: true,
}

export default nextConfig
```

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "perf: configure Next.js image optimization for WebP/AVIF"
```

---

### Task 3: Migrate app/page.tsx to Next.js Image Component

**Files:**
- Modify: `app/page.tsx`

Replace basic img tag with Next.js Image for automatic optimization, lazy loading, and CLS prevention.

- [ ] **Step 1: Add Image import to app/page.tsx**

At the top of the file, add:
```typescript
import Image from 'next/image'
```

- [ ] **Step 2: Find and replace img tag in ListingCard render**

Locate the img tag inside the map() that renders recent listings. Current code should look like:
```typescript
<img src={listing.images[0]} alt={listing.title} />
```

Replace with:
```typescript
<Image
  src={listing.images[0]}
  alt={listing.title}
  width={200}
  height={200}
  className="w-full h-48 object-cover rounded-lg"
  loading="lazy"
  priority={false}
/>
```

- [ ] **Step 3: Verify the page still renders**

Run: `npm run dev`
Navigate to: `http://localhost:3000`
Expected: Hero section and recent listings grid display correctly without visual changes

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "perf: migrate app/page.tsx to Next.js Image component for lazy loading"
```

---

### Task 4: Migrate components/listing-card.tsx to Next.js Image Component

**Files:**
- Modify: `components/listing-card.tsx`

Replace img tag with Image component. Add width/height to prevent CLS. This component is used across marketplace, graded, sealed, and auction listing pages.

- [ ] **Step 1: Add Image import**

At top of `components/listing-card.tsx`:
```typescript
import Image from 'next/image'
```

- [ ] **Step 2: Replace img tag with Image**

Locate:
```typescript
<img src={listing.images[0]} alt={listing.title} />
```

Replace with:
```typescript
<Image
  src={listing.images[0]}
  alt={listing.title}
  width={240}
  height={240}
  className="w-full h-60 object-cover rounded-t-lg group-hover:scale-110 transition-transform duration-300"
  loading="lazy"
  priority={false}
/>
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Navigate to: `http://localhost:3000/marketplace`
Expected: Listing cards display with images, no layout shift, smooth hover scale animation still works

- [ ] **Step 4: Commit**

```bash
git add components/listing-card.tsx
git commit -m "perf: migrate ListingCard to Next.js Image component with width/height"
```

---

## Phase 3: Supabase Storage Migration

### Task 5: Create Supabase Storage Upload Utility

**Files:**
- Create: `lib/supabase/storage.ts`

New utility function to handle uploading files to Supabase Storage and returning public URLs.

- [ ] **Step 1: Create lib/supabase/storage.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function uploadListingImage(file: File): Promise<string> {
  const bucket = 'listing-images'
  const fileName = `${Date.now()}-${file.name}`

  const { error, data } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl.publicUrl
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/storage.ts
git commit -m "feat: create Supabase Storage upload utility for listing images"
```

---

### Task 6: Setup Supabase Storage Bucket (Manual Step)

**Files:**
- No code changes (manual Supabase dashboard step)

Create the `listing-images` bucket and make it public.

- [ ] **Step 1: Go to Supabase Dashboard**

Navigate to: `https://app.supabase.com` → Select CardHaus project → Storage tab

- [ ] **Step 2: Create bucket**

Click "New bucket" button
- Name: `listing-images`
- Check "Public bucket" checkbox
- Click "Create bucket"

- [ ] **Step 3: Set bucket policies**

In the bucket settings, ensure public read access is enabled so returned URLs work for all users.

---

### Task 7: Update PhotoUpload Component for Supabase Storage

**Files:**
- Modify: `components/photo-upload.tsx`

Change from base64 encoding to Supabase Storage uploads. Component now uploads files directly to storage and returns URLs instead of data URLs.

- [ ] **Step 1: Replace photo-upload.tsx imports and state**

```typescript
'use client'
import { useState } from 'react'
import { uploadListingImage } from '@/lib/supabase/storage'

interface PhotoUploadProps {
  value: string[] // Now URLs instead of base64
  onChange: (images: string[]) => void
  maxFiles?: number
}

export default function PhotoUpload({ value, onChange, maxFiles = 5 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList) {
    if (files.length + value.length > maxFiles) {
      setError(`Max ${maxFiles} files allowed`)
      return
    }

    setUploading(true)
    setError('')

    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          continue
        }
        const url = await uploadListingImage(file)
        newUrls.push(url)
      }
      onChange([...value, ...newUrls])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400') }}
        onDragLeave={(e) => e.currentTarget.classList.remove('border-blue-400')}
        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400'); handleFiles(e.dataTransfer.files) }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
        <p className="text-slate-600 font-medium">
          {uploading ? 'Uploading...' : 'Drag photos here or click to select'}
        </p>
        <p className="text-slate-400 text-sm mt-1">Max {maxFiles} images</p>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</div>}

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {value.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run dev`
Check console for TypeScript errors: should be none
Expected: Page with PhotoUpload component loads without errors

- [ ] **Step 3: Commit**

```bash
git add components/photo-upload.tsx
git commit -m "perf: migrate PhotoUpload to Supabase Storage for true asset management"
```

---

### Task 8: Update Listings API to Store URLs

**Files:**
- Modify: `app/api/listings/route.ts`

API now receives array of URLs instead of base64 data URLs. No transformation needed—just store directly in database.

- [ ] **Step 1: Find POST handler in app/api/listings/route.ts**

Locate the `POST` function. It should receive `images: string[]` in the body.

- [ ] **Step 2: Verify URL storage**

The existing code should already work since `images` is just an array of strings (previously base64, now URLs). No code change needed if the API just stores the array as-is.

If there's any base64-specific logic, remove it. The insert should look like:

```typescript
const { data, error } = await supabase
  .from('listings')
  .insert({
    title: body.title,
    description: body.description,
    price: body.price,
    card_type: body.card_type,
    condition: body.condition,
    images: body.images, // URLs from storage
    product_type: body.product_type,
    // ... other fields
  })
```

- [ ] **Step 3: Test by submitting a single listing**

Run: `npm run dev`
Navigate to: `http://localhost:3000/listings/singles/new`
Fill form, upload image, submit
Expected: Image uploads to Supabase Storage, listing is created with storage URL

- [ ] **Step 4: Verify URL in database**

Go to Supabase dashboard → `listings` table → Check `images` column
Expected: Array contains full Supabase Storage URL (e.g., `https://xxx.supabase.co/storage/v1/object/public/listing-images/...`), not base64

- [ ] **Step 5: Commit**

```bash
git add app/api/listings/route.ts
git commit -m "perf: update listings API to store Supabase Storage URLs"
```

---

### Task 9: Update All Listing Form Pages

**Files:**
- Modify: `app/listings/singles/new/page.tsx`
- Modify: `app/listings/graded/new/page.tsx`
- Modify: `app/listings/sealed/new/page.tsx`
- Modify: `app/listings/auction/new/page.tsx`

No code changes needed. PhotoUpload component interface remains the same (value: string[], onChange). Forms already accept string array and pass to API.

- [ ] **Step 1: Verify each form loads and can upload**

For each page:
```
npm run dev
Navigate to: http://localhost:3000/listings/[type]/new
Upload image via PhotoUpload
Expected: Image uploads without error
```

Pages to test:
- `/listings/singles/new`
- `/listings/graded/new`
- `/listings/sealed/new`
- `/listings/auction/new`

- [ ] **Step 2: Submit test listing on each page**

Complete form and submit for each product type
Expected: Listing created successfully with storage URL in images field

- [ ] **Step 3: Commit (no code changes needed)**

```bash
git add -A
git commit -m "perf: all listing forms now use Supabase Storage via PhotoUpload"
```

---

## Phase 4: Code Splitting & Suspense

### Task 10: Create Skeleton Loader Component

**Files:**
- Create: `components/skeleton-card.tsx`

Skeleton loader that matches ListingCard dimensions. Used during Suspense while listing data loads.

- [ ] **Step 1: Create components/skeleton-card.tsx**

```typescript
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-60 bg-slate-200 rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-slate-200 rounded w-1/4" />
          <div className="h-6 bg-slate-200 rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/skeleton-card.tsx
git commit -m "feat: create SkeletonCard component for loading states"
```

---

### Task 11: Add Dynamic Imports & Code Splitting to Marketplace

**Files:**
- Modify: `app/marketplace/page.tsx`

Add Suspense boundary with skeleton loader. This doesn't require dynamic import since marketplace is already code-split by route, but we add Suspense for smoother loading state.

- [ ] **Step 1: Add Suspense import at top**

```typescript
import { Suspense } from 'react'
import { SkeletonGrid } from '@/components/skeleton-card'
```

- [ ] **Step 2: Wrap listing grid in Suspense**

Find where ListingCard components are rendered in the grid. Wrap the grid in Suspense:

```typescript
<Suspense fallback={<SkeletonGrid count={12} />}>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {listings.map(listing => (
      <ListingCard key={listing.id} listing={listing} />
    ))}
  </div>
</Suspense>
```

- [ ] **Step 3: Verify page renders with skeleton loader**

Run: `npm run dev`
Navigate to: `http://localhost:3000/marketplace`
Expected: Brief skeleton cards visible, then fade to real listings

- [ ] **Step 4: Commit**

```bash
git add app/marketplace/page.tsx
git commit -m "perf: add Suspense boundary to marketplace with skeleton loader"
```

---

### Task 12: Add Debounce Utility Function

**Files:**
- Create: `lib/utils/debounce.ts`

Create a debounce utility used by search and filter handlers.

- [ ] **Step 1: Create lib/utils/debounce.ts**

```typescript
export function debounce<Args extends any[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Args) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/utils/debounce.ts
git commit -m "feat: add debounce utility for search and filter handlers"
```

---

### Task 13: Add Debounce to Search Handler

**Files:**
- Modify: `components/nav.tsx`

Debounce search input to avoid excessive API calls while user is typing.

- [ ] **Step 1: Add debounce import**

```typescript
import { debounce } from '@/lib/utils/debounce'
```

- [ ] **Step 2: Find SearchDropdown usage**

Locate where `<SearchDropdown>` is used in nav. It likely has an onChange handler or query prop.

- [ ] **Step 3: Wrap search handler with debounce**

If SearchDropdown accepts an onChange callback:

```typescript
const debouncedSearch = useRef(
  debounce((query: string) => {
    // Your search logic here
  }, 300)
).current

// Pass to SearchDropdown
<SearchDropdown onChange={(val) => debouncedSearch(val)} />
```

If SearchDropdown is more complex, look for where it handles input change and debounce that handler.

- [ ] **Step 4: Test search**

Run: `npm run dev`
Navigate to: `http://localhost:3000`
Type in search box slowly
Expected: No API calls fire for each keystroke, only after 300ms pause

- [ ] **Step 5: Commit**

```bash
git add components/nav.tsx
git commit -m "perf: debounce search input to reduce API calls"
```

---

### Task 14: Add Debounce to Marketplace Filters

**Files:**
- Modify: `app/marketplace/page.tsx`

Debounce filter click handlers to avoid rapid state updates.

- [ ] **Step 1: Add debounce import**

```typescript
import { debounce } from '@/lib/utils/debounce'
```

- [ ] **Step 2: Create debounced filter handler**

Wrap filter onclick handlers:

```typescript
const debouncedSetFilter = useRef(
  debounce((filterName: string, value: string) => {
    setFilters(f => ({ ...f, [filterName]: value }))
  }, 100)
).current
```

- [ ] **Step 3: Update filter buttons**

Replace onClick handlers:

```typescript
// Before
onClick={() => setFilters(f => ({ ...f, card_type: type }))}

// After
onClick={() => debouncedSetFilter('card_type', type)}
```

- [ ] **Step 4: Test filters**

Run: `npm run dev`
Navigate to: `http://localhost:3000/marketplace`
Rapidly click filter buttons
Expected: Smooth response, no jank from too many state updates

- [ ] **Step 5: Commit**

```bash
git add app/marketplace/page.tsx
git commit -m "perf: debounce filter handlers to reduce state updates"
```

---

## Phase 5: Animation & Micro-Optimizations

### Task 15: Optimize Hover Animations

**Files:**
- Modify: `components/listing-card.tsx` (already modified in Task 4, but verify animations)

Ensure hover animations use transform/opacity only (GPU-accelerated) and not width/height.

- [ ] **Step 1: Verify current animation in listing-card.tsx**

The Image component should have:
```typescript
className="... group-hover:scale-110 transition-transform duration-300"
```

This is correct (uses transform). No code change needed.

- [ ] **Step 2: Check card-level hover animations**

Look for any other animations on the card element. Ensure they also use transform/opacity:

Good:
```typescript
className="hover:shadow-lg transition-shadow"  // shadow is OK
className="hover:scale-105 transition-transform"  // transform is OK
```

Bad (avoid):
```typescript
className="hover:w-96"  // width change—reflow
className="hover:p-8"  // padding change—reflow
```

- [ ] **Step 3: Verify page renders smoothly**

Run: `npm run dev`
Navigate to: `http://localhost:3000/marketplace`
Hover over listing cards
Expected: Smooth animation at 60fps, no jank

- [ ] **Step 4: Commit**

```bash
git add components/listing-card.tsx
git commit -m "perf: verify hover animations use GPU-accelerated transform only"
```

---

### Task 16: Optimize Image Loading Strategy

**Files:**
- Modify: `components/listing-card.tsx` (Image component)
- Modify: `app/page.tsx` (Image component)

Ensure images below the fold use `loading="lazy"` and hero/priority images use `priority={true}`.

- [ ] **Step 1: Update app/page.tsx hero image**

If there's a hero image on home page, add `priority={true}`:

```typescript
<Image
  src={heroImageSrc}
  alt="Hero"
  width={1200}
  height={400}
  className="w-full h-96 object-cover"
  priority={true}  // LCP image—load immediately
/>
```

- [ ] **Step 2: Verify listing cards use lazy loading**

Both in app/page.tsx and components/listing-card.tsx, Image components should have:

```typescript
loading="lazy"
priority={false}
```

Already done in previous tasks. Verify no `priority={true}` on cards below hero.

- [ ] **Step 3: Test images load correctly**

Run: `npm run dev`
Navigate to: `http://localhost:3000`
Open DevTools → Network tab
Expected: Hero image loads first, card images load as they scroll into view

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/listing-card.tsx
git commit -m "perf: optimize image loading strategy with priority and lazy"
```

---

## Task Summary

Total tasks: 16 across 5 phases

- Phase 1 (Font): Task 1 (1 file)
- Phase 2 (Image Config): Tasks 2-4 (4 files)
- Phase 3 (Storage): Tasks 5-9 (11 files + manual step)
- Phase 4 (Code Splitting): Tasks 10-14 (5 files)
- Phase 5 (Animation/Optimization): Tasks 15-16 (2 files)
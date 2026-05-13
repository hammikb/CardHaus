import type { ListingStatus } from './supabase/types'

export function clampRequestedQuantity(requestedQuantity: number | undefined, availableQuantity: number) {
  const normalized = Number(requestedQuantity ?? 1)
  if (!Number.isFinite(normalized) || normalized < 1) return 1
  return Math.min(Math.floor(normalized), availableQuantity)
}

export function deriveInventoryAfterPurchase(
  availableQuantity: number,
  purchasedQuantity: number,
): { quantity: number; status: ListingStatus } {
  const nextQuantity = Math.max(availableQuantity - purchasedQuantity, 0)

  return {
    quantity: nextQuantity,
    status: nextQuantity === 0 ? 'sold' : 'active',
  }
}

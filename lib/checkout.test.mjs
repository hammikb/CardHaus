import test from 'node:test'
import assert from 'node:assert/strict'

import { clampRequestedQuantity, deriveInventoryAfterPurchase } from './checkout.ts'

test('clamps requested quantity to at least one and at most available inventory', () => {
  assert.equal(clampRequestedQuantity(undefined, 4), 1)
  assert.equal(clampRequestedQuantity(0, 4), 1)
  assert.equal(clampRequestedQuantity(2, 4), 2)
  assert.equal(clampRequestedQuantity(9, 4), 4)
})

test('marks listing sold only when inventory reaches zero', () => {
  assert.deepEqual(deriveInventoryAfterPurchase(4, 2), {
    quantity: 2,
    status: 'active',
  })

  assert.deepEqual(deriveInventoryAfterPurchase(2, 2), {
    quantity: 0,
    status: 'sold',
  })
})

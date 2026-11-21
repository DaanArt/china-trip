import { expect, test } from 'vitest'
import { nextPosition, reorderPositions } from './ordering'
import { makeStop } from './fixtures'

const a = makeStop({ name: 'A', position: 1 })
const b = makeStop({ name: 'B', position: 2 })
const c = makeStop({ name: 'C', position: 3 })

test('nextPosition appends after the highest position', () => {
  expect(nextPosition([])).toBe(1)
  expect(nextPosition([a, c, b])).toBe(4)
})

test('moving a stop down swaps it with the next one', () => {
  expect(reorderPositions([a, b, c], a.id, 1)).toEqual([
    { id: b.id, position: 1 },
    { id: a.id, position: 2 },
  ])
})

test('moving the first stop up changes nothing', () => {
  expect(reorderPositions([a, b, c], a.id, -1)).toEqual([])
})

test('duplicate positions are renumbered cleanly 1..n on a move', () => {
  const x = makeStop({ name: 'X', position: 2, created_at: '2026-11-21T09:00:00Z' })
  const y = makeStop({ name: 'Y', position: 2, created_at: '2026-11-21T11:00:00Z' })
  // Order is A, X, Y (tie broken by created_at). Move Y up: A, Y, X.
  expect(reorderPositions([a, y, x], y.id, -1)).toEqual([{ id: x.id, position: 3 }])
})

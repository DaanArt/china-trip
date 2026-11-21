import { expect, test } from 'vitest'
import { planCheckWrites, type CheckResult } from './checkApply'
import { makePlace, makeStop, makeWish } from './fixtures'

const chengdu = makeStop({ name: 'Chengdu' })
const pandas = makeWish({ text: 'See pandas' })
const existing = { wishlist: [pandas], stops: [chengdu], places: [makePlace({ name: 'jinli street', status: 'dismissed' })] }
const NOW = '2026-11-21T12:00:00.000Z'

function plan(result: Partial<CheckResult>) {
  return planCheckWrites({ wishlist: [], suggestions: [], ...result }, existing, NOW)
}

test('updates known wishlist items with their check result', () => {
  const out = plan({ wishlist: [{ id: pandas.id, status: 'covered', check_note: 'Chengdu, day 9', covered_by_stop_id: chengdu.id }] })
  expect(out.wishlistUpdates).toEqual([
    { id: pandas.id, status: 'covered', check_note: 'Chengdu, day 9', covered_by_stop_id: chengdu.id, checked_at: NOW },
  ])
})

test('skips an unknown wishlist id', () => {
  const out = plan({ wishlist: [{ id: 'nope', status: 'covered', check_note: 'x', covered_by_stop_id: null }] })
  expect(out.wishlistUpdates).toEqual([])
  expect(out.skipped.join()).toContain('nope')
})

test('skips a covered_by_stop_id that is not a stop', () => {
  const out = plan({ wishlist: [{ id: pandas.id, status: 'covered', check_note: 'x', covered_by_stop_id: 'ghost' }] })
  expect(out.wishlistUpdates[0].covered_by_stop_id).toBeNull()
})

test('skips a suggestion for an unknown stop', () => {
  const out = plan({ suggestions: [{ name: 'Panda base', lat: 30.7, lng: 104.1, note: '', stop_id: 'ghost', wishlist_item_id: null }] })
  expect(out.placeInserts).toEqual([])
  expect(out.skipped.join()).toContain('Panda base')
})

test('skips a suggestion whose name already exists, even when dismissed', () => {
  const out = plan({ suggestions: [{ name: 'Jinli Street', lat: 30.6, lng: 104.0, note: '', stop_id: null, wishlist_item_id: null }] })
  expect(out.placeInserts).toEqual([])
})

test('skips duplicate names within one result', () => {
  const s = { name: 'Panda base', lat: 30.7, lng: 104.1, note: '', stop_id: chengdu.id, wishlist_item_id: pandas.id }
  expect(plan({ suggestions: [s, { ...s }] }).placeInserts).toHaveLength(1)
})

test('inserts valid suggestions as Claude suggestions; no stop means an idea pin', () => {
  const out = plan({
    suggestions: [
      { name: 'Panda base', lat: 30.7, lng: 104.1, note: 'Go early', stop_id: chengdu.id, wishlist_item_id: pandas.id },
      { name: 'Mount Emei', lat: 29.5, lng: 103.3, note: '', stop_id: null, wishlist_item_id: 'unknown-wish' },
    ],
  })
  expect(out.placeInserts).toEqual([
    { stop_id: chengdu.id, name: 'Panda base', lat: 30.7, lng: 104.1, note: 'Go early', source: 'claude', status: 'suggested', wishlist_item_id: pandas.id },
    { stop_id: null, name: 'Mount Emei', lat: 29.5, lng: 103.3, note: null, source: 'claude', status: 'suggested', wishlist_item_id: null },
  ])
})

test('only ever produces wishlist updates and place inserts', () => {
  expect(Object.keys(plan({})).sort()).toEqual(['placeInserts', 'skipped', 'wishlistUpdates'])
})

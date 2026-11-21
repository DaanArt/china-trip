import { describe, expect, test } from 'vitest'
import { buildRoute, legKey } from './route'
import { makeLeg, makeStop, makeTrip, standardTrip } from './fixtures'

describe('buildRoute on the standard trip', () => {
  const { trip, stops, legs, beijing, xian, chengdu } = standardTrip()
  const route = buildRoute(trip, stops, legs)

  test('stop dates follow from 17 April, with the overnight train adding a day', () => {
    expect(route.stops.map(s => [s.stop.name, s.start, s.end])).toEqual([
      ['Beijing', '2027-04-17', '2027-04-22'],
      ["Xi'an", '2027-04-22', '2027-04-25'],
      ['Chengdu', '2027-04-26', '2027-04-30'],
    ])
    expect(route.stops[0].nightDates).toHaveLength(5)
  })

  test('legs run inbound, internal, outbound with dates and default modes', () => {
    expect(route.legs.map(l => [l.key, l.kind, l.date, l.mode, l.overnight])).toEqual([
      [legKey(null, beijing.id), 'inbound', '2027-04-17', 'flight', false],
      [legKey(beijing.id, xian.id), 'internal', '2027-04-22', 'train', false],
      [legKey(xian.id, chengdu.id), 'internal', '2027-04-25', 'train', true],
      [legKey(chengdu.id, null), 'outbound', '2027-04-30', 'flight', false],
    ])
  })

  test('counts planned and unplanned nights', () => {
    expect(route.totalNights).toBe(61)
    expect(route.plannedNights).toBe(13)
    expect(route.unplannedNights).toBe(48)
  })
})

test('legKey uses "home" for null ends', () => {
  expect(legKey(null, 'a')).toBe('home->a')
  expect(legKey('a', null)).toBe('a->home')
})

test('an empty trip has no legs and 61 unplanned nights', () => {
  const route = buildRoute(makeTrip(), [], [])
  expect(route.stops).toEqual([])
  expect(route.legs).toEqual([])
  expect(route.unplannedNights).toBe(61)
})

test('bad nights input is clamped to whole nights of at least 0', () => {
  const stops = [
    makeStop({ name: 'A', position: 1, nights: -2 }),
    makeStop({ name: 'B', position: 2, nights: 2.7 }),
    makeStop({ name: 'C', position: 3, nights: Number.NaN }),
  ]
  const route = buildRoute(makeTrip(), stops, [])
  expect(route.stops.map(s => s.nights)).toEqual([0, 2, 0])
  expect(route.stops[2].end).toBe('2027-04-19')
})

test('duplicate positions sort by created_at', () => {
  const first = makeStop({ name: 'First', position: 2, created_at: '2026-11-21T09:00:00Z' })
  const second = makeStop({ name: 'Second', position: 2, created_at: '2026-11-21T11:00:00Z' })
  const route = buildRoute(makeTrip(), [second, first], [])
  expect(route.stops.map(s => s.stop.name)).toEqual(['First', 'Second'])
})

test('a 0-night stop starts and ends on the same day', () => {
  const route = buildRoute(makeTrip(), [makeStop({ name: 'Pass', nights: 0 })], [])
  expect(route.stops[0].start).toBe('2027-04-17')
  expect(route.stops[0].end).toBe('2027-04-17')
  expect(route.stops[0].nightDates).toEqual([])
})

test('a leg row between stops that are no longer adjacent is an orphan', () => {
  const { trip, stops, legs, beijing, chengdu } = standardTrip()
  const orphan = makeLeg({ from_stop_id: beijing.id, to_stop_id: chengdu.id })
  const route = buildRoute(trip, stops, [...legs, orphan])
  expect(route.orphanLegs).toEqual([orphan])
  expect(route.legs.find(l => l.row === orphan)).toBeUndefined()
})

test('an overnight flag on the inbound leg is ignored', () => {
  const { trip, stops, legs, beijing } = standardTrip()
  const inbound = makeLeg({ from_stop_id: null, to_stop_id: beijing.id, overnight: true, mode: 'flight' })
  const route = buildRoute(trip, stops, [...legs, inbound])
  expect(route.stops[0].start).toBe('2027-04-17')
  expect(route.legs[0].overnight).toBe(false)
  expect(route.legs[0].row).toBe(inbound)
  expect(route.plannedNights).toBe(13)
})

test('absurd nights are capped so a typo cannot freeze the app', () => {
  const route = buildRoute(makeTrip(), [makeStop({ name: 'Typo', nights: 1e8 })], [])
  expect(route.stops[0].nights).toBe(366)
  expect(route.stops[0].nightDates).toHaveLength(366)
})

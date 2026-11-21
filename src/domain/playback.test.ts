import { expect, test } from 'vitest'
import { buildRoute } from './route'
import { dayLabel, positionAt, travelledPath } from './playback'
import { makeTrip, standardTrip } from './fixtures'

const { trip, stops, legs, beijing, xian } = standardTrip()
const route = buildRoute(trip, stops, legs)
const at = (s: { lat: number; lng: number }) => ({ lat: s.lat, lng: s.lng })

test('on a stay day the marker is at the stop', () => {
  expect(positionAt(route, 1)).toEqual(at(beijing))
})

test('on a travel day the marker moves along the leg', () => {
  const mid = positionAt(route, 5.5)!
  expect(mid.lat).toBeCloseTo((beijing.lat + xian.lat) / 2)
  expect(mid.lng).toBeCloseTo((beijing.lng + xian.lng) / 2)
  expect(positionAt(route, 5)).toEqual(at(beijing))
})

test('the inbound leg has no home coordinates, so the marker sits at the first stop', () => {
  expect(positionAt(route, 0.5)).toEqual(at(beijing))
})

test('an unplanned day has no marker', () => {
  expect(positionAt(route, 14)).toBeNull()
  expect(positionAt(buildRoute(makeTrip(), [], []), 3)).toBeNull()
})

test('day labels say where you are', () => {
  expect(dayLabel(route, 0)).toBe('Day 1 · 17 Apr · Travelling Amsterdam → Beijing')
  expect(dayLabel(route, 1)).toBe('Day 2 · 18 Apr · Beijing')
  expect(dayLabel(route, 8)).toBe("Day 9 · 25 Apr · Travelling Xi'an → Chengdu")
  expect(dayLabel(route, 14)).toBe('Day 15 · 1 May · Unplanned')
  expect(dayLabel(route, 61)).toBe('Day 62 · 17 Jun · Unplanned')
})

test('the travelled path runs through the stops reached so far, ending at the marker', () => {
  expect(travelledPath(route, 5.5)).toEqual([at(beijing), positionAt(route, 5.5)])
  expect(travelledPath(route, 6)).toEqual([at(beijing), at(xian), at(xian)])
  expect(travelledPath(route, 14)).toEqual([])
})

import { expect, test } from 'vitest'
import { buildRoute, legKey } from './route'
import { locateDay, tripDays } from './timelapse'
import { makeStop, makeTrip, standardTrip } from './fixtures'

const { trip, stops, legs, beijing, xian, chengdu } = standardTrip()
const route = buildRoute(trip, stops, legs)

test('tripDays covers 17 April to 17 June inclusive', () => {
  const days = tripDays(route)
  expect(days).toHaveLength(62)
  expect(days[0]).toBe('2027-04-17')
  expect(days[61]).toBe('2027-06-17')
})

test('locateDay puts travel days on the leg and other days at the stop', () => {
  expect(locateDay(route, '2027-04-17')).toEqual({ kind: 'leg', legKey: legKey(null, beijing.id) })
  expect(locateDay(route, '2027-04-18')).toEqual({ kind: 'stop', stopId: beijing.id })
  expect(locateDay(route, '2027-04-22')).toEqual({ kind: 'leg', legKey: legKey(beijing.id, xian.id) })
  expect(locateDay(route, '2027-04-23')).toEqual({ kind: 'stop', stopId: xian.id })
  expect(locateDay(route, '2027-04-25')).toEqual({ kind: 'leg', legKey: legKey(xian.id, chengdu.id) })
  expect(locateDay(route, '2027-04-26')).toEqual({ kind: 'stop', stopId: chengdu.id })
  expect(locateDay(route, '2027-04-30')).toEqual({ kind: 'leg', legKey: legKey(chengdu.id, null) })
  expect(locateDay(route, '2027-05-01')).toEqual({ kind: 'unplanned' })
})

test('a 0-night stop wins over the legs on its day', () => {
  const a = makeStop({ name: 'A', position: 1, nights: 2 })
  const pass = makeStop({ name: 'Pass', position: 2, nights: 0 })
  const b = makeStop({ name: 'B', position: 3, nights: 2 })
  const r = buildRoute(makeTrip(), [a, pass, b], [])
  expect(locateDay(r, '2027-04-19')).toEqual({ kind: 'stop', stopId: pass.id })
})

test('every day of an empty trip is unplanned', () => {
  const empty = buildRoute(makeTrip(), [], [])
  expect(tripDays(empty).every(d => locateDay(empty, d).kind === 'unplanned')).toBe(true)
})

import { expect, test } from 'vitest'
import { buildRoute } from './route'
import { dateLabels, defaultDates } from './reservationDefaults'
import { standardTrip } from './fixtures'

const { trip, stops, legs } = standardTrip()
const route = buildRoute(trip, stops, legs)

test('a hotel defaults to the whole stay', () => {
  expect(defaultDates('hotel', { stop: route.stops[0] })).toEqual({ start_date: '2027-04-17', end_date: '2027-04-22' })
})

test('transport on an internal leg defaults to departing on the leg date', () => {
  expect(defaultDates('transport', { leg: route.legs[1] })).toEqual({ start_date: '2027-04-22', end_date: null })
})

test('transport on an overnight leg arrives the next day', () => {
  expect(defaultDates('transport', { leg: route.legs[2] })).toEqual({ start_date: '2027-04-25', end_date: '2027-04-26' })
})

test('the inbound flight defaults to arriving on 17 April', () => {
  expect(defaultDates('transport', { leg: route.legs[0] })).toEqual({ start_date: null, end_date: '2027-04-17' })
})

test('an activity at a stop defaults to its first day', () => {
  expect(defaultDates('activity', { stop: route.stops[1] })).toEqual({ start_date: '2027-04-22', end_date: null })
})

test('date labels depend on the kind', () => {
  expect(dateLabels('hotel')).toEqual(['Check-in', 'Check-out'])
  expect(dateLabels('transport')).toEqual(['Departs', 'Arrives'])
  expect(dateLabels('activity')).toEqual(['Start', 'End'])
})

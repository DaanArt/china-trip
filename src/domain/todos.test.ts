import { describe, expect, test } from 'vitest'
import { buildRoute } from './route'
import { deriveTodos } from './todos'
import { makeLeg, makeReservation, makeStop, makeTrip, standardTrip } from './fixtures'
import type { Leg, Reservation, Stop } from './types'

function texts(stops: Stop[], legs: Leg[], reservations: Reservation[] = []) {
  return deriveTodos(buildRoute(makeTrip(), stops, legs), reservations).map(t => t.text)
}

test('the standard trip without bookings lists every gap in route order', () => {
  const { stops, legs } = standardTrip()
  expect(texts(stops, legs)).toEqual([
    '48 nights still unplanned before 17 June',
    'Book flight Amsterdam → Beijing, 17 Apr',
    'Book hotel in Beijing, 17–22 Apr',
    "Book train Beijing → Xi'an, 22 Apr",
    "Book hotel in Xi'an, 22–25 Apr",
    "Book train Xi'an → Chengdu, 25 Apr",
    'Book hotel in Chengdu, 26–30 Apr',
    'Book flight Chengdu → Amsterdam, 30 Apr',
  ])
})

test('an empty trip only has the unplanned nights', () => {
  expect(texts([], [])).toEqual(['61 nights still unplanned before 17 June'])
})

describe('hotels', () => {
  test('a partial hotel leaves the remaining nights', () => {
    const { stops, legs, beijing } = standardTrip()
    const hotel = makeReservation({ kind: 'hotel', stop_id: beijing.id, start_date: '2027-04-17', end_date: '2027-04-20' })
    const result = texts(stops, legs, [hotel])
    expect(result).toContain('Book hotel in Beijing, 20–22 Apr')
    expect(result).not.toContain('Book hotel in Beijing, 17–22 Apr')
  })

  test('a hotel outside the stay is flagged and still covers the nights it overlaps', () => {
    const { stops, legs, beijing } = standardTrip()
    const hotel = makeReservation({ kind: 'hotel', stop_id: beijing.id, start_date: '2027-04-15', end_date: '2027-04-20' })
    const result = texts(stops, legs, [hotel])
    expect(result).toContain('Hotel in Beijing booked 15–20 Apr, stay is now 17–22 Apr')
    expect(result).toContain('Book hotel in Beijing, 20–22 Apr')
  })

  test('a hotel without a check-out date covers one night', () => {
    const { stops, legs, beijing } = standardTrip()
    const hotel = makeReservation({ kind: 'hotel', stop_id: beijing.id, start_date: '2027-04-17' })
    expect(texts(stops, legs, [hotel])).toContain('Book hotel in Beijing, 18–22 Apr')
  })

  test('a stop marked no booking needed gets no hotel to-do', () => {
    const { stops, legs } = standardTrip()
    stops[0] = { ...stops[0], no_booking_needed: true }
    expect(texts(stops, legs).some(t => t.startsWith('Book hotel in Beijing'))).toBe(false)
  })
})

describe('legs', () => {
  test('a transport booking on the wrong date is flagged instead of "book"', () => {
    const { stops, legs, beijing, xian } = standardTrip()
    const leg = makeLeg({ from_stop_id: beijing.id, to_stop_id: xian.id })
    const train = makeReservation({ kind: 'transport', leg_id: leg.id, start_date: '2027-04-23' })
    const result = texts(stops, [...legs, leg], [train])
    expect(result).toContain("Train Beijing → Xi'an is booked for 23 Apr, but the plan says 22 Apr")
    expect(result).not.toContain("Book train Beijing → Xi'an, 22 Apr")
  })

  test('the inbound flight is checked against its arrival date', () => {
    const { stops, legs, beijing } = standardTrip()
    const inbound = makeLeg({ from_stop_id: null, to_stop_id: beijing.id, mode: 'flight' })
    const flight = makeReservation({ kind: 'transport', leg_id: inbound.id, start_date: '2027-04-16', end_date: '2027-04-17' })
    const result = texts(stops, [...legs, inbound], [flight])
    expect(result.some(t => t.includes('Amsterdam → Beijing'))).toBe(false)
  })

  test('a leg marked no booking needed gets no to-do', () => {
    const { stops, legs, beijing, xian } = standardTrip()
    const leg = makeLeg({ from_stop_id: beijing.id, to_stop_id: xian.id, no_booking_needed: true })
    expect(texts(stops, [...legs, leg]).some(t => t.includes("Beijing → Xi'an"))).toBe(false)
  })

  test('car and other modes read as transport', () => {
    const { stops, legs, beijing, xian } = standardTrip()
    const leg = makeLeg({ from_stop_id: beijing.id, to_stop_id: xian.id, mode: 'car' })
    expect(texts(stops, [...legs, leg])).toContain("Book transport Beijing → Xi'an, 22 Apr")
  })

  test('a booking on a leg that left the route is flagged last', () => {
    const { stops, legs, beijing, chengdu } = standardTrip()
    const orphan = makeLeg({ from_stop_id: beijing.id, to_stop_id: chengdu.id })
    const train = makeReservation({ kind: 'transport', leg_id: orphan.id, start_date: '2027-04-22' })
    const result = texts(stops, [...legs, orphan], [train])
    expect(result[result.length - 1]).toBe('Booking Beijing → Chengdu no longer matches the route')
  })

  test('an orphan leg without bookings is not mentioned', () => {
    const { stops, legs, beijing, chengdu } = standardTrip()
    const orphan = makeLeg({ from_stop_id: beijing.id, to_stop_id: chengdu.id })
    expect(texts(stops, [...legs, orphan]).some(t => t.includes('no longer matches'))).toBe(false)
  })
})

describe('trip length', () => {
  test('an overrun is reported first', () => {
    const stops = [
      makeStop({ name: 'A', position: 1, nights: 30 }),
      makeStop({ name: 'B', position: 2, nights: 20 }),
      makeStop({ name: 'C', position: 3, nights: 14 }),
    ]
    expect(texts(stops, [])[0]).toBe('Plan runs 3 nights past 17 June')
  })

  test('one remaining night is singular', () => {
    expect(texts([makeStop({ name: 'A', nights: 60 })], [])[0]).toBe('1 night still unplanned before 17 June')
  })

  test('a fully planned trip has no length to-do', () => {
    expect(texts([makeStop({ name: 'A', nights: 61 })], [])[0]).toBe('Book flight Amsterdam → A, 17 Apr')
  })
})

test('to-dos carry stable ids and their target', () => {
  const { trip, stops, legs, beijing } = standardTrip()
  const todos = deriveTodos(buildRoute(trip, stops, legs), [])
  const hotel = todos.find(t => t.kind === 'book-hotel' && t.stopId === beijing.id)
  expect(hotel?.id).toBe(`book-hotel:${beijing.id}:2027-04-17`)
  const inbound = todos.find(t => t.kind === 'book-leg')
  expect(inbound?.legKey).toBe(`home->${beijing.id}`)
  expect(new Set(todos.map(t => t.id)).size).toBe(todos.length)
})

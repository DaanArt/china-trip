import { expect, test } from 'vitest'
import { stopDeletionImpact } from './deletion'
import { makeLeg, makeReservation, standardTrip } from './fixtures'
import type { Attachment } from './types'

const file = (reservation_id: string): Attachment => ({
  id: `f-${reservation_id}`, reservation_id, storage_path: `${reservation_id}/x.pdf`, filename: 'x.pdf', content_type: null, created_by: null, created_at: '',
})

test('bookings on journeys into or out of the stop block deletion', () => {
  const { stops, legs, beijing, xian, xianChengdu } = standardTrip()
  const into = makeLeg({ from_stop_id: beijing.id, to_stop_id: xian.id })
  const train = makeReservation({ kind: 'transport', leg_id: into.id })
  const sleeper = makeReservation({ kind: 'transport', leg_id: xianChengdu.id })
  const impact = stopDeletionImpact({ stops, legs: [...legs, into], reservations: [train, sleeper], attachments: [], home: 'Home' }, xian.id)
  expect(impact.blockingJourneys).toEqual(["Beijing → Xi'an", "Xi'an → Chengdu"])
})

test('journeys without bookings do not block, and the stop reservations and their files are listed', () => {
  const { stops, legs, beijing } = standardTrip()
  const hotel = makeReservation({ kind: 'hotel', stop_id: beijing.id })
  const impact = stopDeletionImpact({ stops, legs, reservations: [hotel], attachments: [file(hotel.id), file('other')], home: 'Home' }, beijing.id)
  expect(impact.blockingJourneys).toEqual([])
  expect(impact.reservations).toEqual([hotel])
  expect(impact.files.map(f => f.reservation_id)).toEqual([hotel.id])
})

test('a booked inbound flight blocks deleting the first stop', () => {
  const { stops, legs, beijing } = standardTrip()
  const inbound = makeLeg({ from_stop_id: null, to_stop_id: beijing.id })
  const flight = makeReservation({ kind: 'transport', leg_id: inbound.id })
  const impact = stopDeletionImpact({ stops, legs: [...legs, inbound], reservations: [flight], attachments: [], home: 'Home' }, beijing.id)
  expect(impact.blockingJourneys).toEqual(['Home → Beijing'])
})

test("files of the stop's activity bookings are removed too", () => {
  const { stops, legs, beijing } = standardTrip()
  const activity = { id: 'act-1', trip_id: 'trip-1', stop_id: beijing.id, title: 'Opera', notes: null, created_by: null, created_at: '' }
  const tickets = makeReservation({ kind: 'activity', activity_id: activity.id })
  const impact = stopDeletionImpact(
    { stops, legs, reservations: [tickets], attachments: [file(tickets.id)], activities: [activity], home: 'Home' },
    beijing.id,
  )
  expect(impact.files.map(f => f.reservation_id)).toEqual([tickets.id])
  expect(impact.activities).toEqual([activity])
})

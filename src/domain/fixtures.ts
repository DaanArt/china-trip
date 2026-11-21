// Test fixture builders (used by the domain tests only).
import type { Leg, Place, Reservation, Stop, Trip, WishlistItem } from './types'

let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

export function makeTrip(over: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'China 2027',
    start_date: '2027-04-17',
    end_date: '2027-06-17',
    home_label: 'Amsterdam',
    ...over,
  }
}

export function makeStop(over: Partial<Stop> & { name: string }): Stop {
  return {
    id: nextId('stop'),
    trip_id: 'trip-1',
    position: 1,
    name_zh: null,
    lat: 0,
    lng: 0,
    nights: 1,
    no_booking_needed: false,
    no_booking_note: null,
    notes: null,
    created_by: null,
    created_at: '2026-11-21T10:00:00Z',
    ...over,
  }
}

export function makeLeg(over: Partial<Leg> & { from_stop_id: string | null; to_stop_id: string | null }): Leg {
  return {
    id: nextId('leg'),
    trip_id: 'trip-1',
    mode: 'train',
    overnight: false,
    no_booking_needed: false,
    no_booking_note: null,
    manual_hours: null,
    notes: null,
    created_by: null,
    created_at: '2026-11-21T10:00:00Z',
    ...over,
  }
}

export function makeReservation(over: Partial<Reservation> & Pick<Reservation, 'kind'>): Reservation {
  return {
    id: nextId('res'),
    trip_id: 'trip-1',
    stop_id: null,
    leg_id: null,
    title: 'Booking',
    confirmation: null,
    start_date: null,
    start_time: null,
    end_date: null,
    end_time: null,
    address: null,
    address_zh: null,
    details: null,
    created_by: null,
    created_at: '2026-11-21T10:00:00Z',
    ...over,
  }
}

export function makePlace(over: Partial<Place> & { name: string }): Place {
  return {
    id: nextId('place'),
    trip_id: 'trip-1',
    stop_id: null,
    lat: 0,
    lng: 0,
    note: null,
    source: 'manual',
    status: 'active',
    wishlist_item_id: null,
    created_by: null,
    created_at: '2026-11-21T10:00:00Z',
    ...over,
  }
}

export function makeWish(over: Partial<WishlistItem> & { text: string }): WishlistItem {
  return {
    id: nextId('wish'),
    trip_id: 'trip-1',
    note: null,
    status: 'unchecked',
    check_note: null,
    covered_by_stop_id: null,
    checked_at: null,
    created_by: null,
    created_at: '2026-11-21T10:00:00Z',
    ...over,
  }
}

/** Beijing 5 nights → Xi'an 3 nights → (overnight train) → Chengdu 4 nights. */
export function standardTrip() {
  const trip = makeTrip()
  const beijing = makeStop({ name: 'Beijing', position: 1, nights: 5, lat: 39.9042, lng: 116.4074 })
  const xian = makeStop({ name: "Xi'an", position: 2, nights: 3, lat: 34.3416, lng: 108.9398 })
  const chengdu = makeStop({ name: 'Chengdu', position: 3, nights: 4, lat: 30.5728, lng: 104.0668 })
  const xianChengdu = makeLeg({ from_stop_id: xian.id, to_stop_id: chengdu.id, overnight: true })
  return { trip, beijing, xian, chengdu, stops: [beijing, xian, chengdu], legs: [xianChengdu], xianChengdu }
}

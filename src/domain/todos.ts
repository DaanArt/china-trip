import { addDays, formatDay, formatDayLong, formatRange } from './dates'
import type { Route, RouteLeg, RouteStop } from './route'
import type { ISODate, Mode, Reservation } from './types'

export type TodoKind = 'unplanned' | 'overrun' | 'book-leg' | 'leg-date' | 'book-hotel' | 'hotel-dates' | 'orphan-leg'

export interface Todo {
  id: string
  kind: TodoKind
  text: string
  stopId?: string
  legKey?: string
}

const plural = (n: number) => `${n} night${n === 1 ? '' : 's'}`
const modeWord = (m: Mode) => (m === 'car' || m === 'other' ? 'transport' : m)
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function deriveTodos(route: Route, reservations: Reservation[]): Todo[] {
  const home = route.trip.home_label
  const placeName = (s: { name: string } | null) => s?.name ?? home
  const todos: Todo[] = []

  const endLong = formatDayLong(route.trip.end_date)
  if (route.unplannedNights > 0) {
    todos.push({ id: 'unplanned', kind: 'unplanned', text: `${plural(route.unplannedNights)} still unplanned before ${endLong}` })
  } else if (route.unplannedNights < 0) {
    todos.push({ id: 'overrun', kind: 'overrun', text: `Plan runs ${plural(-route.unplannedNights)} past ${endLong}` })
  }

  const legTodos = (leg: RouteLeg) => {
    const label = `${placeName(leg.from)} → ${placeName(leg.to)}`
    const bookings = leg.row
      ? reservations.filter(r => r.leg_id === leg.row!.id && r.kind === 'transport')
      : []
    if (bookings.length === 0) {
      if (!leg.row?.no_booking_needed) {
        todos.push({ id: `book-leg:${leg.key}`, kind: 'book-leg', legKey: leg.key, text: `Book ${modeWord(leg.mode)} ${label}, ${formatDay(leg.date)}` })
      }
      return
    }
    for (const r of bookings) {
      const booked = leg.kind === 'inbound' ? (r.end_date ?? r.start_date) : r.start_date
      if (booked && booked !== leg.date) {
        todos.push({
          id: `leg-date:${r.id}`,
          kind: 'leg-date',
          legKey: leg.key,
          text: `${capital(modeWord(leg.mode))} ${label} is booked for ${formatDay(booked)}, but the plan says ${formatDay(leg.date)}`,
        })
      }
    }
  }

  const hotelTodos = (rs: RouteStop) => {
    const hotels = reservations.filter(r => r.stop_id === rs.stop.id && r.kind === 'hotel' && r.start_date)
    for (const h of hotels) {
      const checkIn = h.start_date!
      const checkOut = h.end_date ?? addDays(checkIn, 1)
      if (checkIn < rs.start || checkOut > rs.end) {
        todos.push({
          id: `hotel-dates:${h.id}`,
          kind: 'hotel-dates',
          stopId: rs.stop.id,
          text: `Hotel in ${rs.stop.name} booked ${formatRange(checkIn, checkOut)}, stay is now ${formatRange(rs.start, rs.end)}`,
        })
      }
    }
    if (rs.stop.no_booking_needed) return

    const covered = (night: ISODate) =>
      hotels.some(h => night >= h.start_date! && night < (h.end_date ?? addDays(h.start_date!, 1)))
    let runStart: ISODate | null = null
    let runEnd: ISODate | null = null
    const flush = () => {
      if (!runStart || !runEnd) return
      todos.push({
        id: `book-hotel:${rs.stop.id}:${runStart}`,
        kind: 'book-hotel',
        stopId: rs.stop.id,
        text: `Book hotel in ${rs.stop.name}, ${formatRange(runStart, addDays(runEnd, 1))}`,
      })
      runStart = runEnd = null
    }
    for (const night of rs.nightDates) {
      if (covered(night)) {
        flush()
      } else {
        runStart ??= night
        runEnd = night
      }
    }
    flush()
  }

  // Walk the route in order: inbound leg, stop, leg, stop, ..., outbound leg.
  route.legs.forEach((leg, i) => {
    legTodos(leg)
    const stop = route.stops[i]
    if (stop) hotelTodos(stop)
  })

  for (const orphan of route.orphanLegs) {
    if (!reservations.some(r => r.leg_id === orphan.id)) continue
    const byId = (id: string | null) => route.stops.find(s => s.stop.id === id)?.stop ?? null
    todos.push({
      id: `orphan-leg:${orphan.id}`,
      kind: 'orphan-leg',
      text: `Booking ${placeName(byId(orphan.from_stop_id))} → ${placeName(byId(orphan.to_stop_id))} no longer matches the route`,
    })
  }

  return todos
}

import { addDays, diffDays } from './dates'
import type { ISODate, Leg, Mode, Stop, Trip } from './types'

export interface RouteStop {
  stop: Stop
  index: number
  nights: number // clamped: whole number >= 0
  start: ISODate // arrival day
  end: ISODate // departure day (= start + nights)
  nightDates: ISODate[] // the nights spent here, [start, end)
}

export interface RouteLeg {
  key: string
  kind: 'inbound' | 'internal' | 'outbound'
  from: Stop | null // null = home
  to: Stop | null // null = home
  row: Leg | null // stored leg data, if any
  date: ISODate // departure day; arrival day for the inbound leg
  mode: Mode
  overnight: boolean // always false for inbound/outbound
}

export interface Route {
  trip: Trip
  stops: RouteStop[]
  legs: RouteLeg[]
  totalNights: number
  plannedNights: number
  unplannedNights: number // negative = the plan overruns the end date
  orphanLegs: Leg[] // stored legs whose stops are no longer adjacent
}

export function legKey(fromId: string | null, toId: string | null): string {
  return `${fromId ?? 'home'}->${toId ?? 'home'}`
}

function clampNights(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export function buildRoute(trip: Trip, stops: Stop[], legs: Leg[]): Route {
  const rows = new Map(legs.map(l => [legKey(l.from_stop_id, l.to_stop_id), l]))
  const sorted = [...stops].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  )

  const routeStops: RouteStop[] = []
  const routeLegs: RouteLeg[] = []
  let cursor = trip.start_date
  let overnightLegs = 0

  sorted.forEach((stop, index) => {
    const prev = sorted[index - 1] ?? null
    const key = legKey(prev?.id ?? null, stop.id)
    const row = rows.get(key) ?? null

    if (!prev) {
      routeLegs.push({ key, kind: 'inbound', from: null, to: stop, row, date: trip.start_date, mode: row?.mode ?? 'flight', overnight: false })
    } else {
      const overnight = row?.overnight ?? false
      routeLegs.push({ key, kind: 'internal', from: prev, to: stop, row, date: cursor, mode: row?.mode ?? 'train', overnight })
      if (overnight) {
        overnightLegs++
        cursor = addDays(cursor, 1)
      }
    }

    const nights = clampNights(stop.nights)
    const start = cursor
    const end = addDays(start, nights)
    const nightDates = Array.from({ length: nights }, (_, i) => addDays(start, i))
    routeStops.push({ stop, index, nights, start, end, nightDates })
    cursor = end
  })

  const last = sorted[sorted.length - 1]
  if (last) {
    const key = legKey(last.id, null)
    const row = rows.get(key) ?? null
    routeLegs.push({ key, kind: 'outbound', from: last, to: null, row, date: cursor, mode: row?.mode ?? 'flight', overnight: false })
  }

  const inRoute = new Set(routeLegs.map(l => l.key))
  const totalNights = diffDays(trip.end_date, trip.start_date)
  const plannedNights = routeStops.reduce((sum, s) => sum + s.nights, 0) + overnightLegs

  return {
    trip,
    stops: routeStops,
    legs: routeLegs,
    totalNights,
    plannedNights,
    unplannedNights: totalNights - plannedNights,
    orphanLegs: legs.filter(l => !inRoute.has(legKey(l.from_stop_id, l.to_stop_id))),
  }
}

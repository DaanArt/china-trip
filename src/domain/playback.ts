import { addDays, formatDay } from './dates'
import type { LatLng } from './geo'
import type { Route } from './route'
import { locateDay } from './timelapse'

/** t = day index (0 = start date); the fraction is progress through that day. */
function dayOf(route: Route, t: number) {
  const index = Math.floor(t)
  return { index, fraction: t - index, date: addDays(route.trip.start_date, index) }
}

const point = (s: { lat: number; lng: number }): LatLng => ({ lat: s.lat, lng: s.lng })

export function positionAt(route: Route, t: number): LatLng | null {
  const { date, fraction } = dayOf(route, t)
  const pos = locateDay(route, date)
  if (pos.kind === 'unplanned') return null
  if (pos.kind === 'stop') return point(route.stops.find(s => s.stop.id === pos.stopId)!.stop)
  const leg = route.legs.find(l => l.key === pos.legKey)!
  // Home has no coordinates: the marker waits at the stop end of the leg.
  const from = leg.from ?? leg.to!
  const to = leg.to ?? leg.from!
  return { lat: from.lat + (to.lat - from.lat) * fraction, lng: from.lng + (to.lng - from.lng) * fraction }
}

export function dayLabel(route: Route, index: number): string {
  const { date } = dayOf(route, index)
  const pos = locateDay(route, date)
  const home = route.trip.home_label
  let where = 'Unplanned'
  if (pos.kind === 'stop') where = route.stops.find(s => s.stop.id === pos.stopId)!.stop.name
  if (pos.kind === 'leg') {
    const leg = route.legs.find(l => l.key === pos.legKey)!
    where = `Travelling ${leg.from?.name ?? home} → ${leg.to?.name ?? home}`
  }
  return `Day ${index + 1} · ${formatDay(date)} · ${where}`
}

/** Stops reached so far, then the marker. Empty when there is no marker. */
export function travelledPath(route: Route, t: number): LatLng[] {
  const marker = positionAt(route, t)
  if (!marker) return []
  const { date } = dayOf(route, t)
  const pos = locateDay(route, date)
  const arrivingAt = pos.kind === 'leg' ? route.legs.find(l => l.key === pos.legKey)?.to?.id : undefined
  const reached = route.stops.filter(rs => rs.start <= date && rs.stop.id !== arrivingAt)
  return [...reached.map(rs => point(rs.stop)), marker]
}

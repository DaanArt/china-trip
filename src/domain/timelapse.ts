import { addDays, diffDays } from './dates'
import type { Route } from './route'
import type { ISODate } from './types'

export type DayPosition =
  | { kind: 'stop'; stopId: string }
  | { kind: 'leg'; legKey: string }
  | { kind: 'unplanned' }

/** Every day from the trip's start to its end, inclusive. */
export function tripDays(route: Route): ISODate[] {
  const { start_date, end_date } = route.trip
  return Array.from({ length: diffDays(end_date, start_date) + 1 }, (_, i) => addDays(start_date, i))
}

/** Where the travellers are on a day: travel days sit on the leg. */
export function locateDay(route: Route, date: ISODate): DayPosition {
  const dayVisit = route.stops.find(s => s.nights === 0 && s.start === date)
  if (dayVisit) return { kind: 'stop', stopId: dayVisit.stop.id }
  const leg = route.legs.find(l => l.date === date)
  if (leg) return { kind: 'leg', legKey: leg.key }
  const stay = route.stops.find(s => s.start <= date && date < s.end)
  if (stay) return { kind: 'stop', stopId: stay.stop.id }
  return { kind: 'unplanned' }
}

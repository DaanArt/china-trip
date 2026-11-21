import { addDays } from './dates'
import type { RouteLeg, RouteStop } from './route'
import type { ISODate, ReservationKind } from './types'

type Target = { stop: RouteStop } | { leg: RouteLeg }

/** Dates a new reservation starts with, taken from the plan. */
export function defaultDates(kind: ReservationKind, target: Target): { start_date: ISODate | null; end_date: ISODate | null } {
  if ('stop' in target) {
    const { start, end } = target.stop
    return kind === 'hotel' ? { start_date: start, end_date: end } : { start_date: start, end_date: null }
  }
  const leg = target.leg
  if (leg.kind === 'inbound') return { start_date: null, end_date: leg.date }
  return { start_date: leg.date, end_date: leg.overnight ? addDays(leg.date, 1) : null }
}

export function dateLabels(kind: ReservationKind): [string, string] {
  if (kind === 'hotel') return ['Check-in', 'Check-out']
  if (kind === 'transport') return ['Departs', 'Arrives']
  return ['Start', 'End']
}

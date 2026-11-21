import type { Place } from './types'

export interface PlaceGroups {
  visible: Place[] // everything not dismissed
  ideas: Place[] // active pins off the route
  suggestions: Place[] // proposed by the check, awaiting keep/dismiss
  byStop: Map<string, Place[]> // active or suggested places attached to a stop
}

export function groupPlaces(places: Place[]): PlaceGroups {
  const visible = places.filter(p => p.status !== 'dismissed')
  const byStop = new Map<string, Place[]>()
  for (const p of visible) {
    if (p.stop_id) byStop.set(p.stop_id, [...(byStop.get(p.stop_id) ?? []), p])
  }
  return {
    visible,
    ideas: visible.filter(p => !p.stop_id && p.status === 'active'),
    suggestions: visible.filter(p => p.status === 'suggested'),
    byStop,
  }
}

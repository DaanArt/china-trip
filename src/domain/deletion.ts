import type { Attachment, Leg, Reservation, Stop } from './types'

/**
 * What deleting a stop would take with it. Journeys into or out of the stop
 * are deleted too, so any bookings on them block the deletion: those must be
 * deleted or moved first (they may hold ticket numbers needed for refunds).
 */
export function stopDeletionImpact(
  data: { stops: Stop[]; legs: Leg[]; reservations: Reservation[]; attachments: Attachment[]; home: string },
  stopId: string,
): { reservations: Reservation[]; files: Attachment[]; blockingJourneys: string[] } {
  const name = (id: string | null) => (id === null ? data.home : data.stops.find(s => s.id === id)?.name ?? '?')
  const touching = [
    ...data.legs.filter(l => l.to_stop_id === stopId), // journeys into the stop first
    ...data.legs.filter(l => l.from_stop_id === stopId),
  ]
  const blockingJourneys = touching
    .filter(l => data.reservations.some(r => r.leg_id === l.id))
    .map(l => `${name(l.from_stop_id)} → ${name(l.to_stop_id)}`)
  const reservations = data.reservations.filter(r => r.stop_id === stopId)
  const ids = new Set(reservations.map(r => r.id))
  return { reservations, files: data.attachments.filter(a => ids.has(a.reservation_id)), blockingJourneys }
}

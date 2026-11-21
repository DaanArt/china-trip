import { useState } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { formatDay } from '../../domain/dates'
import type { RouteLeg } from '../../domain/route'
import type { Leg, Mode } from '../../domain/types'
import { Reservations } from './Reservations'
import { legSummary } from './StopsPanel'

const MODES: Mode[] = ['train', 'flight', 'bus', 'car', 'other']

export function LegDetail({ legKey, children }: { legKey: string; children?: React.ReactNode }) {
  const { route, actions } = useTrip()
  const [error, setError] = useState<string | null>(null)
  const leg = route?.legs.find(l => l.key === legKey)
  if (!route || !actions) return null
  if (!leg) {
    const orphan = route.orphanLegs.find(l => legKey === `${l.from_stop_id ?? 'home'}->${l.to_stop_id ?? 'home'}`)
    if (!orphan) return <p className="muted panel">This journey is no longer on the route.</p>
    const stop = (id: string | null) => route.stops.find(s => s.stop.id === id)?.stop ?? null
    const from = stop(orphan.from_stop_id)
    const to = stop(orphan.to_stop_id)
    const asLeg: RouteLeg = { key: legKey, kind: 'internal', from, to, row: orphan, date: '', mode: orphan.mode, overnight: orphan.overnight }
    return (
      <section className="panel">
        <h2>{from?.name ?? route.trip.home_label} → {to?.name ?? route.trip.home_label}</h2>
        <p className="error">This journey is no longer on the route. Delete the booking, or book the new journey and then delete this one.</p>
        <Reservations target={{ leg: asLeg }} allowAdd={false} />
      </section>
    )
  }

  const home = route.trip.home_label
  const save = (patch: Partial<Leg>) =>
    actions.upsertLeg(leg.from?.id ?? null, leg.to?.id ?? null, patch).catch(err => setError((err as Error).message))
  const internal = leg.kind === 'internal'

  return (
    <section className="panel">
      <h2>
        {leg.from?.name ?? home} → {leg.to?.name ?? home}
      </h2>
      <p className="muted">
        {leg.kind === 'inbound' ? 'Arrive' : 'Depart'} {formatDay(leg.date)} · {legSummary(leg)}
      </p>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="fields">
        <label>
          Transport
          <select value={leg.mode} onChange={e => save({ mode: e.target.value as Mode })}>
            {MODES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        {internal && (
          <label className="check">
            <input type="checkbox" key={`o-${leg.overnight}`} defaultChecked={leg.overnight} onChange={e => save({ overnight: e.target.checked })} />
            Overnight
            <span className="muted small">sleeper train or red-eye: the night is spent travelling</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" key={`n-${!!leg.row?.no_booking_needed}`} defaultChecked={!!leg.row?.no_booking_needed} onChange={e => save({ no_booking_needed: e.target.checked })} />
          No booking needed
        </label>
        {leg.row?.no_booking_needed && (
          <label>
            Why
            <input
              key={`nb-${leg.row.no_booking_note}`}
              defaultValue={leg.row.no_booking_note ?? ''}
              placeholder="e.g. bus, buy at the station"
              onBlur={e => e.target.value !== (leg.row?.no_booking_note ?? '') && save({ no_booking_note: e.target.value || null })}
            />
          </label>
        )}
        {internal && (
          <label>
            Travel time (hours)
            <input
              key={`h-${leg.row?.manual_hours}`}
              type="number"
              min={0}
              step={0.25}
              defaultValue={leg.row?.manual_hours ?? ''}
              placeholder="estimated"
              onBlur={e => {
                const v = e.target.value === '' ? null : Math.max(0, Number(e.target.value))
                if (v !== (leg.row?.manual_hours ?? null)) save({ manual_hours: v })
              }}
            />
          </label>
        )}
      </div>
      <Reservations target={{ leg }} />
      {children}
    </section>
  )
}

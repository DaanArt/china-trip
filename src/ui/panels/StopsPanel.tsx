import { useState } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { formatDay, formatRange } from '../../domain/dates'
import { estimateHours, formatHours, haversineKm } from '../../domain/geo'
import type { RouteLeg } from '../../domain/route'
import { MODE_ICON, type MapMode, type Selection } from '../selection'
import { StopSearch } from './StopSearch'

interface Props {
  onSelect: (s: Selection) => void
  mapMode: MapMode
  setMapMode: (m: MapMode) => void
}

export function legSummary(leg: RouteLeg): string {
  const parts: string[] = [leg.mode]
  if (leg.from && leg.to) {
    const km = haversineKm(leg.from, leg.to)
    const hours = leg.row?.manual_hours ?? estimateHours(km, leg.mode)
    parts.push(`~${Math.round(km)} km`, formatHours(hours))
  }
  if (leg.overnight) parts.push('overnight')
  return parts.join(' · ')
}

export function StopsPanel({ onSelect, mapMode, setMapMode }: Props) {
  const { route, actions } = useTrip()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!route || !actions) return null

  const home = route.trip.home_label
  const act = (p: Promise<unknown>) => p.catch(err => setError((err as Error).message))

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Route</h2>
        <span className="muted">
          {route.plannedNights} of {route.totalNights} nights planned
        </span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <ul className="route">
        {route.legs.map((leg, i) => {
          const rs = route.stops[i]
          return (
            <li key={leg.key} className="route-item">
              <button className="leg" aria-label={`Leg ${leg.from?.name ?? home} → ${leg.to?.name ?? home}`} onClick={() => onSelect({ kind: 'leg', key: leg.key })}>
                <span aria-hidden>{MODE_ICON[leg.mode]}</span> {legSummary(leg)}
                <span className="muted"> · {formatDay(leg.date)}</span>
              </button>
              {rs && (
                <ul>
                  <li className="stop" aria-label={`Stop ${rs.stop.name}`}>
                    <span className="num">{rs.index + 1}</span>
                    <button className="stop-name" onClick={() => onSelect({ kind: 'stop', id: rs.stop.id })}>
                      {rs.stop.name}
                    </button>
                    <span className="dates">{rs.nights === 0 ? formatDay(rs.start) : formatRange(rs.start, rs.end)}</span>
                    <input
                      key={`${rs.stop.id}-${rs.stop.nights}`}
                      className="nights"
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`Nights in ${rs.stop.name}`}
                      defaultValue={rs.stop.nights}
                      onBlur={e => {
                        const n = Math.max(0, Math.floor(Number(e.target.value) || 0))
                        if (n !== rs.stop.nights) act(actions.updateStop(rs.stop.id, { nights: n }))
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <span className="muted small">n</span>
                    <button className="icon" aria-label={`Move ${rs.stop.name} up`} disabled={rs.index === 0} onClick={() => act(actions.moveStop(rs.stop.id, -1))}>↑</button>
                    <button className="icon" aria-label={`Move ${rs.stop.name} down`} disabled={rs.index === route.stops.length - 1} onClick={() => act(actions.moveStop(rs.stop.id, 1))}>↓</button>
                  </li>
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {route.stops.length === 0 && <p className="muted">No stops yet. Add the first place you’ll arrive in on 17 April.</p>}

      {adding ? (
        <StopSearch
          pickingOnMap={mapMode === 'add-stop'}
          onTogglePickOnMap={() => setMapMode(mapMode === 'add-stop' ? null : 'add-stop')}
          onCancel={() => {
            setAdding(false)
            setMapMode(null)
          }}
          onPick={p => {
            setAdding(false)
            act(actions.addStop({ name: p.name, lat: p.lat, lng: p.lng }))
          }}
        />
      ) : (
        <button className="primary" onClick={() => setAdding(true)}>Add stop</button>
      )}
    </section>
  )
}

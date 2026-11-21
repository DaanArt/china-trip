import { useState } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { formatRange } from '../../domain/dates'
import type { Stop } from '../../domain/types'
import { groupPlaces } from '../../domain/places'
import type { Selection } from '../selection'
import { Reservations } from './Reservations'
import { StopSearch } from './StopSearch'

interface Props {
  stopId: string
  onDeleted: () => void
  onSelect: (s: Selection) => void
  children?: React.ReactNode
}

export function StopDetail({ stopId, onDeleted, onSelect, children }: Props) {
  const { data, route, actions } = useTrip()
  const [error, setError] = useState<string | null>(null)
  const [addingPlace, setAddingPlace] = useState(false)
  const rs = route?.stops.find(s => s.stop.id === stopId)
  if (!data || !actions || !rs) return <p className="muted">This stop is no longer on the route.</p>

  const stop = rs.stop
  const save = (patch: Partial<Stop>) => actions.updateStop(stop.id, patch).catch(err => setError((err as Error).message))
  const text = (field: 'name' | 'name_zh' | 'notes' | 'no_booking_note') => ({
    defaultValue: stop[field] ?? '',
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const v = e.target.value.trim()
      if (v !== (stop[field] ?? '') && (field !== 'name' || v)) save({ [field]: v || null })
    },
  })

  async function remove() {
    const n = data!.reservations.filter(r => r.stop_id === stop.id).length
    const msg = n ? `Delete ${stop.name} and its ${n} reservation${n === 1 ? '' : 's'}?` : `Delete ${stop.name}?`
    if (!window.confirm(msg)) return
    try {
      await actions!.deleteStop(stop.id)
      onDeleted()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="panel" key={stop.id}>
      <h2>{stop.name}</h2>
      <p className="muted">
        {rs.nights === 0 ? 'Day visit' : `${formatRange(rs.start, rs.end)} · ${rs.nights} night${rs.nights === 1 ? '' : 's'}`}
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="fields">
        <label>Name<input {...text('name')} /></label>
        <label>Name in Chinese<input {...text('name_zh')} lang="zh" /></label>
        <label className="check">
          <input type="checkbox" key={`n-${stop.no_booking_needed}`} defaultChecked={stop.no_booking_needed} onChange={e => save({ no_booking_needed: e.target.checked })} />
          No hotel needed
        </label>
        {stop.no_booking_needed && (
          <label>Why<input {...text('no_booking_note')} placeholder="e.g. staying with friends" /></label>
        )}
        <label>Notes<textarea rows={3} {...text('notes')} /></label>
      </div>
      <Reservations target={{ stop: rs }} />
      <section className="places" aria-label="Places">
        <h3>Places</h3>
        <ul className="places-list">
          {(groupPlaces(data.places).byStop.get(stop.id) ?? []).map(p => (
            <li key={p.id}>
              <button className={`place-link ${p.status}`} onClick={() => onSelect({ kind: 'place', id: p.id })}>{p.name}</button>
              {p.status === 'suggested' && <span className="muted small"> · suggested</span>}
            </li>
          ))}
        </ul>
        {addingPlace ? (
          <StopSearch
            placeholder="Something to do nearby"
            near={{ lat: stop.lat, lng: stop.lng }}
            onCancel={() => setAddingPlace(false)}
            onPick={p => {
              setAddingPlace(false)
              actions.addPlace({ name: p.name, lat: p.lat, lng: p.lng, stop_id: stop.id }).catch(err => setError((err as Error).message))
            }}
          />
        ) : (
          <button onClick={() => setAddingPlace(true)}>Add place</button>
        )}
      </section>
      {children}
      <button className="danger" onClick={remove}>Delete stop</button>
    </section>
  )
}

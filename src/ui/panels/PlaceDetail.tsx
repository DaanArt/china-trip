import { useState } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import type { Selection } from '../selection'

export function PlaceDetail({ placeId, onSelect }: { placeId: string; onSelect: (s: Selection) => void }) {
  const { data, route, actions, nameOf } = useTrip()
  const [target, setTarget] = useState('')
  const [error, setError] = useState<string | null>(null)
  const place = data?.places.find(p => p.id === placeId)
  if (!data || !route || !actions || !place) return <p className="muted">This place is gone.</p>

  const stop = route.stops.find(s => s.stop.id === place.stop_id)?.stop
  const wish = data.wishlist.find(w => w.id === place.wishlist_item_id)
  const fail = (err: unknown) => setError((err as Error).message)

  const dismiss = () => actions.updatePlace(place.id, { status: 'dismissed' }).then(() => onSelect(null), fail)
  const keep = () => actions.updatePlace(place.id, { status: 'active' }).catch(fail)
  const toStop = () => actions.ideaToStop(place).then(s => onSelect({ kind: 'stop', id: s.id }), fail)
  const attach = () => actions.updatePlace(place.id, { stop_id: target, status: 'active' }).then(() => onSelect(null), fail)

  return (
    <section className="panel">
      <h2>{place.name}</h2>
      <p className="muted">
        {stop ? `At ${stop.name}` : 'Idea pin, not on the route'}
        {place.status === 'suggested' && ' · suggested'}
      </p>
      {place.source === 'claude' && <p className="small">Suggested by Claude</p>}
      {wish && <p className="small">For your wish: “{wish.text}”</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="fields">
        <label>
          Note
          <textarea
            rows={3}
            key={place.note ?? ''}
            defaultValue={place.note ?? ''}
            onBlur={e => e.target.value !== (place.note ?? '') && actions.updatePlace(place.id, { note: e.target.value || null }).catch(fail)}
          />
        </label>
      </div>

      {!place.stop_id && (
        <div className="fields">
          <button className="primary" onClick={toStop}>Add as new stop</button>
          <div className="row">
            <label className="grow">
              Attach to stop
              <select value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">Choose a stop…</option>
                {route.stops.map(s => (
                  <option key={s.stop.id} value={s.stop.id}>{s.stop.name}</option>
                ))}
              </select>
            </label>
            <button disabled={!target} onClick={attach}>Attach</button>
          </div>
        </div>
      )}
      <div className="row">
        {place.status === 'suggested' && place.stop_id && <button onClick={keep}>Keep</button>}
        <button onClick={dismiss}>Dismiss</button>
      </div>
      <p className="muted small">Added by {nameOf(place.created_by)}</p>
    </section>
  )
}

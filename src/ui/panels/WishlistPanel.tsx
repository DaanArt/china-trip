import { useState, type FormEvent } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { groupPlaces } from '../../domain/places'
import type { Place, WishlistItem } from '../../domain/types'
import type { MapMode, Selection } from '../selection'
import { Comments } from './Comments'
import { StopSearch } from './StopSearch'

interface Props {
  onSelect: (s: Selection) => void
  mapMode: MapMode
  setMapMode: (m: MapMode) => void
}

function status(w: WishlistItem): string {
  if (w.status === 'covered') return `Covered: ${w.check_note ?? ''}`
  if (w.status === 'not_covered') return `Not covered: ${w.check_note ?? ''}`
  return 'Not checked yet'
}

export function WishlistPanel({ onSelect, mapMode, setMapMode }: Props) {
  const { data, actions, nameOf } = useTrip()
  const [text, setText] = useState('')
  const [addingIdea, setAddingIdea] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!data || !actions) return null

  const groups = groupPlaces(data.places)
  const act = (p: Promise<unknown>) => p.catch(err => setError((err as Error).message))
  const placeButton = (p: Place) => (
    <li key={p.id}>
      <button className={`place-link ${p.status}`} onClick={() => onSelect({ kind: 'place', id: p.id })}>{p.name}</button>
    </li>
  )

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    await act(actions!.addWish(text.trim()))
    setText('')
  }

  return (
    <section className="panel">
      <h2>Wishlist</h2>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="row" onSubmit={add}>
        <input aria-label="New wish" placeholder="Something you want the trip to include" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" disabled={!text.trim()}>Add</button>
      </form>
      <ul className="wishes">
        {data.wishlist.map(w => (
          <li key={w.id} aria-label={w.text} className="wish">
            <div className="row spread">
              <span>{w.text}</span>
              <button className="link" aria-label={`Delete wish ${w.text}`} onClick={() => window.confirm(`Delete “${w.text}”?`) && act(actions.deleteWish(w.id))}>✕</button>
            </div>
            <span className={`chip ${w.status}`}>{status(w)}</span>
            <span className="muted small"> · added by {nameOf(w.created_by)}</span>
            <Comments target={{ wishlist_item_id: w.id }} />
            {data.places.some(p => p.wishlist_item_id === w.id && p.status !== 'dismissed') && (
              <ul className="linked">{data.places.filter(p => p.wishlist_item_id === w.id && p.status !== 'dismissed').map(placeButton)}</ul>
            )}
          </li>
        ))}
      </ul>
      {data.wishlist.length === 0 && <p className="muted small">Add things you want the trip to include, like “see the pandas”.</p>}

      <h3>Ideas and suggestions</h3>
      <p className="muted small">Places not on the route yet. Faded pins on the map.</p>
      {groups.suggestions.length > 0 && (
        <>
          <h4>Suggested by Claude</h4>
          <ul className="places-list">{groups.suggestions.map(placeButton)}</ul>
        </>
      )}
      {groups.ideas.length > 0 && <ul className="places-list">{groups.ideas.map(placeButton)}</ul>}
      {addingIdea ? (
        <StopSearch
          placeholder="Place for an idea pin"
          pickingOnMap={mapMode === 'add-idea'}
          onTogglePickOnMap={() => setMapMode(mapMode === 'add-idea' ? null : 'add-idea')}
          onCancel={() => {
            setAddingIdea(false)
            setMapMode(null)
          }}
          onPick={p => {
            setAddingIdea(false)
            act(actions.addPlace({ name: p.name, lat: p.lat, lng: p.lng, stop_id: null }))
          }}
        />
      ) : (
        <button onClick={() => setAddingIdea(true)}>Add idea pin</button>
      )}
    </section>
  )
}

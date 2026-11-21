import { useState, type FormEvent } from 'react'
import { searchPlaces, type PlaceResult } from '../../lib/photon'

interface Props {
  onPick: (p: PlaceResult) => void
  onCancel: () => void
  pickingOnMap: boolean
  onTogglePickOnMap: () => void
  near?: { lat: number; lng: number }
  placeholder?: string
}

export function StopSearch({ onPick, onCancel, pickingOnMap, onTogglePickOnMap, near, placeholder = 'City or place' }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PlaceResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function search(e: FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    setError(null)
    try {
      setResults(await searchPlaces(q.trim(), near))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="search">
      <form onSubmit={search} className="row">
        <input aria-label="Search a place" placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)} autoFocus />
        <button type="submit" disabled={busy}>Search</button>
      </form>
      {error && <p className="error">{error} — you can still pick a spot on the map.</p>}
      {results?.length === 0 && <p className="muted">No places found.</p>}
      {results && results.length > 0 && (
        <ul className="results">
          {results.map(r => (
            <li key={`${r.lat},${r.lng}`}>
              <button onClick={() => onPick(r)}>{r.label}</button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button className={pickingOnMap ? 'primary' : ''} onClick={onTogglePickOnMap}>
          {pickingOnMap ? 'Click on the map…' : 'Click on map instead'}
        </button>
        <button className="link" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

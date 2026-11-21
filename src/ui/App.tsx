import { useState } from 'react'
import { useTrip } from '../data/TripDataProvider'
import { reverseGeocode } from '../lib/photon'
import { supabase } from '../lib/supabase'
import { TripMap } from './map/TripMap'
import { LegDetail } from './panels/LegDetail'
import { StopDetail } from './panels/StopDetail'
import { StopsPanel } from './panels/StopsPanel'
import type { MapMode, Selection } from './selection'

export function App() {
  const { data, route, error, actions } = useTrip()
  const [selection, setSelection] = useState<Selection>(null)
  const [mapMode, setMapMode] = useState<MapMode>(null)

  async function onMapClick(lat: number, lng: number) {
    if (!actions) return
    const mode = mapMode
    setMapMode(null)
    const suggested = (await reverseGeocode(lat, lng)) ?? ''
    const name = window.prompt(mode === 'add-stop' ? 'Name for this stop' : 'Name for this idea', suggested)?.trim()
    if (!name) return
    if (mode === 'add-stop') await actions.addStop({ name, lat, lng })
    else await actions.addPlace({ name, lat, lng, stop_id: null })
  }

  const back = <button className="link back" onClick={() => setSelection(null)}>← Back</button>

  return (
    <div className="app">
      <header className="topbar">
        <strong>{data?.trip.name}</strong>
        {error && <span className="error">Sync problem: {error}</span>}
        <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <section className="map-area">
        {route && <TripMap route={route} selection={selection} onSelect={setSelection} mapMode={mapMode} onMapClick={onMapClick} />}
      </section>
      <aside className="side">
        {selection?.kind === 'stop' && (
          <>
            {back}
            <StopDetail stopId={selection.id} onDeleted={() => setSelection(null)} />
          </>
        )}
        {selection?.kind === 'leg' && (
          <>
            {back}
            <LegDetail legKey={selection.key} />
          </>
        )}
        {!selection && <StopsPanel onSelect={setSelection} mapMode={mapMode} setMapMode={setMapMode} />}
      </aside>
      <footer className="bottombar" />
    </div>
  )
}

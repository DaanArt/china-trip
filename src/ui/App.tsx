import { useState } from 'react'
import { useTrip } from '../data/TripDataProvider'
import { reverseGeocode } from '../lib/photon'
import { supabase } from '../lib/supabase'
import { TripMap } from './map/TripMap'
import { LegDetail } from './panels/LegDetail'
import { PlaceDetail } from './panels/PlaceDetail'
import { StopDetail } from './panels/StopDetail'
import { StopsPanel } from './panels/StopsPanel'
import { TodoPanel } from './panels/TodoPanel'
import { WishlistPanel } from './panels/WishlistPanel'
import { positionAt, travelledPath } from '../domain/playback'
import type { MapMode, Selection } from './selection'
import { Timelapse } from './Timelapse'

type Tab = 'route' | 'todo' | 'wishlist'

export function App() {
  const { data, route, todos, error, actions } = useTrip()
  const [selection, setSelection] = useState<Selection>(null)
  const [mapMode, setMapMode] = useState<MapMode>(null)
  const [tab, setTab] = useState<Tab>('route')
  const [t, setT] = useState<number | null>(null)

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
  const tabs: [Tab, string][] = [
    ['route', 'Route'],
    ['todo', `To do (${todos.length})`],
    ['wishlist', 'Wishlist'],
  ]

  return (
    <div className="app">
      <header className="topbar">
        <strong>{data?.trip.name}</strong>
        {error && <span className="error">Sync problem: {error}</span>}
        <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <section className="map-area">
        {route && data && (
          <TripMap
            route={route}
            places={data.places}
            selection={selection}
            onSelect={setSelection}
            mapMode={mapMode}
            onMapClick={onMapClick}
            marker={t === null ? null : positionAt(route, t)}
            travelled={t === null ? [] : travelledPath(route, t)}
          />
        )}
      </section>
      <aside className="side">
        {selection ? (
          <>
            {back}
            {selection.kind === 'stop' && <StopDetail stopId={selection.id} onSelect={setSelection} onDeleted={() => setSelection(null)} />}
            {selection.kind === 'leg' && <LegDetail legKey={selection.key} />}
            {selection.kind === 'place' && <PlaceDetail placeId={selection.id} onSelect={setSelection} />}
          </>
        ) : (
          <>
            <nav className="tabs" role="tablist">
              {tabs.map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </nav>
            {tab === 'route' && <StopsPanel onSelect={setSelection} mapMode={mapMode} setMapMode={setMapMode} />}
            {tab === 'todo' && <TodoPanel onSelect={setSelection} />}
            {tab === 'wishlist' && <WishlistPanel onSelect={setSelection} mapMode={mapMode} setMapMode={setMapMode} />}
          </>
        )}
      </aside>
      <footer className="bottombar">{route && <Timelapse route={route} onChange={setT} />}</footer>
    </div>
  )
}

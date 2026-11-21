import { supabase } from '../lib/supabase'
import { useTrip } from '../data/TripDataProvider'

export function App() {
  const { data, error } = useTrip()
  return (
    <div className="app">
      <header className="topbar">
        <strong>{data?.trip.name}</strong>
        {error && <span className="error">Sync problem: {error}</span>}
        <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <section className="map-area" />
      <aside className="side" />
      <footer className="bottombar" />
    </div>
  )
}

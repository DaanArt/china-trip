import { Login } from '../auth/Login'
import { NamePrompt } from '../auth/NamePrompt'
import { useSession } from '../auth/useSession'
import { TripDataProvider, useTrip } from '../data/TripDataProvider'
import { App } from './App'

export function Root() {
  const { session, loading } = useSession()
  if (loading) return <p className="center muted">Loading…</p>
  if (!session) return <Login />
  return (
    <TripDataProvider key={session.user.id}>
      <Gate userId={session.user.id} />
    </TripDataProvider>
  )
}

function Gate({ userId }: { userId: string }) {
  const { data, loading, error } = useTrip()
  if (loading) return <p className="center muted">Loading the trip…</p>
  if (error && !data) return <p className="center error">Couldn’t load the trip: {error}</p>
  if (data && !data.profiles.some(p => p.id === userId)) return <NamePrompt />
  return <App />
}

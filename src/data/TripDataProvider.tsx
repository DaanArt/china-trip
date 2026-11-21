import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildRoute, type Route } from '../domain/route'
import { deriveTodos, type Todo } from '../domain/todos'
import type { Attachment, Leg, Place, Profile, Reservation, Stop, Trip, WishlistItem } from '../domain/types'
import { supabase } from '../lib/supabase'
import { createActions, type Actions } from './actions'

export interface TripData {
  trip: Trip
  stops: Stop[]
  legs: Leg[]
  reservations: Reservation[]
  attachments: Attachment[]
  places: Place[]
  wishlist: WishlistItem[]
  profiles: Profile[]
}

interface TripContext {
  data: TripData | null
  route: Route | null
  todos: Todo[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  nameOf: (userId: string | null) => string
  actions: Actions | null
}

const Ctx = createContext<TripContext | null>(null)

async function rows<T>(table: string, order = 'created_at'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*').order(order)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data as T[]
}

async function loadAll(): Promise<TripData> {
  const [trips, stops, legs, reservations, attachments, places, wishlist, profiles] = await Promise.all([
    rows<Trip>('trip', 'start_date'),
    rows<Stop>('stops'),
    rows<Leg>('legs'),
    rows<Reservation>('reservations'),
    rows<Attachment>('attachments'),
    rows<Place>('places'),
    rows<WishlistItem>('wishlist_items'),
    rows<Profile>('profiles', 'display_name'),
  ])
  if (!trips[0]) throw new Error('No trip found')
  return { trip: trips[0], stops, legs, reservations, attachments, places, wishlist, profiles }
}

export function TripDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef<TripData | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await loadAll()
      dataRef.current = next
      setData(next)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    let timer: ReturnType<typeof setTimeout> | undefined
    const channel = supabase
      .channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(timer)
        timer = setTimeout(refresh, 300)
      })
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const route = useMemo(() => (data ? buildRoute(data.trip, data.stops, data.legs) : null), [data])
  const todos = useMemo(() => (route && data ? deriveTodos(route, data.reservations) : []), [route, data])
  const tripId = data?.trip.id
  const actions = useMemo(
    () => (tripId ? createActions(tripId, () => dataRef.current!, refresh) : null),
    [tripId, refresh],
  )
  const nameOf = useCallback(
    (userId: string | null) => data?.profiles.find(p => p.id === userId)?.display_name || 'Someone',
    [data],
  )

  return (
    <Ctx.Provider value={{ data, route, todos, loading, error, refresh, nameOf, actions }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTrip(): TripContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTrip must be used inside TripDataProvider')
  return ctx
}

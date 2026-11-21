import { nextPosition, reorderPositions } from '../domain/ordering'
import type { Activity, Attachment, Leg, Place, Reservation, Stop, Task, WishlistItem } from '../domain/types'
import { supabase } from '../lib/supabase'
import type { TripData } from './TripDataProvider'

type Result<T> = { data: T | null; error: { message: string } | null }

/** Awaits a Supabase query and throws its error; rows asked for with .single() are non-null. */
async function run<T>(query: PromiseLike<Result<T>>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

export type ReservationInput = Omit<Reservation, 'id' | 'trip_id' | 'stop_id' | 'leg_id' | 'activity_id' | 'created_by' | 'created_at'>

/** All mutations. Each one refreshes the shared snapshot when it succeeds. */
export function createActions(tripId: string, getData: () => TripData, refresh: () => Promise<void>) {
  const done = async <T>(value: T): Promise<T> => {
    await refresh()
    return value
  }

  const addStop = async (input: { name: string; name_zh?: string | null; lat: number; lng: number; nights?: number }): Promise<Stop> => {
    const row = { trip_id: tripId, position: nextPosition(getData().stops), nights: 1, ...input }
    return done(await run(supabase.from('stops').insert(row).select().single<Stop>()))
  }

  return {
    addStop,

    updateStop: async (id: string, patch: Partial<Stop>) =>
      done(await run(supabase.from('stops').update(patch).eq('id', id))),

    /** Removes the files of the stop's reservations first; the rows cascade with the stop. */
    deleteStop: async (id: string, files: Attachment[] = []) => {
      if (files.length) await run(supabase.storage.from('attachments').remove(files.map(f => f.storage_path)))
      return done(await run(supabase.from('stops').delete().eq('id', id)))
    },

    moveStop: async (id: string, dir: -1 | 1) => {
      for (const u of reorderPositions(getData().stops, id, dir)) {
        await run(supabase.from('stops').update({ position: u.position }).eq('id', u.id))
      }
      await refresh()
    },

    /** Creates the leg row on first edit; inbound/outbound default to flight. */
    upsertLeg: async (fromId: string | null, toId: string | null, patch: Partial<Leg>): Promise<Leg> => {
      const existing = getData().legs.find(l => l.from_stop_id === fromId && l.to_stop_id === toId)
      if (existing) {
        return done(await run(supabase.from('legs').update(patch).eq('id', existing.id).select().single<Leg>()))
      }
      const mode = patch.mode ?? (fromId === null || toId === null ? 'flight' : 'train')
      const row = { trip_id: tripId, from_stop_id: fromId, to_stop_id: toId, ...patch, mode }
      return done(await run(supabase.from('legs').insert(row).select().single<Leg>()))
    },

    addReservation: async (target: { stop_id: string } | { leg_id: string } | { activity_id: string }, input: ReservationInput): Promise<Reservation> =>
      done(await run(supabase.from('reservations').insert({ trip_id: tripId, ...target, ...input }).select().single<Reservation>())),

    updateReservation: async (id: string, patch: Partial<Reservation>) =>
      done(await run(supabase.from('reservations').update(patch).eq('id', id))),

    deleteReservation: async (r: Reservation, files: Attachment[]) => {
      if (files.length) await run(supabase.storage.from('attachments').remove(files.map(f => f.storage_path)))
      return done(await run(supabase.from('reservations').delete().eq('id', r.id)))
    },

    uploadAttachment: async (reservationId: string, file: File): Promise<Attachment> => {
      // Storage keys must be plain ASCII; the original name lives in the filename column.
      const ext = /\.[a-z0-9]{1,8}$/i.exec(file.name)?.[0].toLowerCase() ?? ''
      const path = `${reservationId}/${crypto.randomUUID()}${ext}`
      await run(supabase.storage.from('attachments').upload(path, file, { contentType: file.type || undefined }))
      const row = { reservation_id: reservationId, storage_path: path, filename: file.name, content_type: file.type || null }
      return done(await run(supabase.from('attachments').insert(row).select().single<Attachment>()))
    },

    openAttachment: async (a: Attachment): Promise<string> => {
      const data = await run(supabase.storage.from('attachments').createSignedUrl(a.storage_path, 3600))
      return data.signedUrl
    },

    deleteAttachment: async (a: Attachment) => {
      await run(supabase.storage.from('attachments').remove([a.storage_path]))
      return done(await run(supabase.from('attachments').delete().eq('id', a.id)))
    },

    addPlace: async (input: { name: string; lat: number; lng: number; note?: string | null; stop_id: string | null }): Promise<Place> =>
      done(await run(supabase.from('places').insert({ trip_id: tripId, ...input }).select().single<Place>())),

    updatePlace: async (id: string, patch: Partial<Place>) =>
      done(await run(supabase.from('places').update(patch).eq('id', id))),

    /** Turns an idea pin into a new stop at the end of the route. */
    ideaToStop: async (place: Place): Promise<Stop> => {
      const stop = await addStop({ name: place.name, lat: place.lat, lng: place.lng })
      await run(supabase.from('places').update({ stop_id: stop.id, status: 'active' }).eq('id', place.id))
      return done(stop)
    },

    addWish: async (text: string): Promise<WishlistItem> =>
      done(await run(supabase.from('wishlist_items').insert({ trip_id: tripId, text }).select().single<WishlistItem>())),

    updateWish: async (id: string, patch: Partial<WishlistItem>) =>
      done(await run(supabase.from('wishlist_items').update(patch).eq('id', id))),

    deleteWish: async (id: string) => done(await run(supabase.from('wishlist_items').delete().eq('id', id))),

    addTask: async (input: { text: string; assignee_ids?: string[]; stop_id?: string | null; due_date?: string | null; source_todo_id?: string | null }): Promise<Task> =>
      done(await run(supabase.from('tasks').insert({ trip_id: tripId, ...input, text: input.text.trim() }).select().single<Task>())),

    /** Ticking a to-do also records when; unticking clears it. */
    updateTask: async (id: string, patch: Partial<Task>) => {
      const withTime = 'done' in patch ? { ...patch, done_at: patch.done ? new Date().toISOString() : null } : patch
      return done(await run(supabase.from('tasks').update(withTime).eq('id', id)))
    },

    deleteTask: async (id: string) => done(await run(supabase.from('tasks').delete().eq('id', id))),

    addActivity: async (input: { stop_id: string; title: string; notes?: string | null }): Promise<Activity> =>
      done(await run(supabase.from('activities').insert({ trip_id: tripId, ...input, title: input.title.trim() }).select().single<Activity>())),

    updateActivity: async (id: string, patch: Partial<Activity>) =>
      done(await run(supabase.from('activities').update(patch).eq('id', id))),

    /** Removes the files of the activity's bookings first; the rows cascade. */
    deleteActivity: async (id: string, files: Attachment[] = []) => {
      if (files.length) await run(supabase.storage.from('attachments').remove(files.map(f => f.storage_path)))
      return done(await run(supabase.from('activities').delete().eq('id', id)))
    },

    /** Sets the signed-in person's hearts (0 removes the vote). */
    vote: async (activityId: string, hearts: number) => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) throw new Error('Not signed in')
      if (hearts <= 0) {
        return done(await run(supabase.from('activity_votes').delete().eq('activity_id', activityId).eq('user_id', data.user.id)))
      }
      return done(await run(supabase.from('activity_votes').upsert({ activity_id: activityId, user_id: data.user.id, hearts }, { onConflict: 'activity_id,user_id' })))
    },

    addComment: async (target: { wishlist_item_id: string } | { activity_id: string } | { task_id: string }, body: string) =>
      done(await run(supabase.from('comments').insert({ trip_id: tripId, ...target, body: body.trim() }))),

    updateComment: async (id: string, body: string) =>
      done(await run(supabase.from('comments').update({ body: body.trim(), edited_at: new Date().toISOString() }).eq('id', id))),

    deleteComment: async (id: string) => done(await run(supabase.from('comments').delete().eq('id', id))),

    saveMyName: async (name: string) => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) throw new Error('Not signed in')
      return done(await run(supabase.from('profiles').upsert({ id: data.user.id, display_name: name })))
    },
  }
}

export type Actions = ReturnType<typeof createActions>

import type { Place, Stop, WishlistItem } from './types'

/** What Claude writes after a wishlist check (the JSON file passed to `apply`). */
export interface CheckResult {
  wishlist: { id: string; status: 'covered' | 'not_covered'; check_note: string; covered_by_stop_id: string | null }[]
  suggestions: { name: string; lat: number; lng: number; note: string; stop_id: string | null; wishlist_item_id: string | null }[]
}

export type WishlistUpdate = Pick<WishlistItem, 'id' | 'status' | 'check_note' | 'covered_by_stop_id'> & { checked_at: string }
export type PlaceInsert = Omit<Place, 'id' | 'trip_id' | 'created_by' | 'created_at'>

/**
 * Validates a check result against the current data. The check may only update
 * wishlist items and add suggested places — never stops, legs or reservations.
 */
export function planCheckWrites(
  result: CheckResult,
  existing: { wishlist: WishlistItem[]; stops: Stop[]; places: Place[] },
  now: string,
): { wishlistUpdates: WishlistUpdate[]; placeInserts: PlaceInsert[]; skipped: string[] } {
  const wishIds = new Set(existing.wishlist.map(w => w.id))
  const stopIds = new Set(existing.stops.map(s => s.id))
  const names = new Set(existing.places.map(p => p.name.trim().toLowerCase()))
  const skipped: string[] = []

  const wishlistUpdates = result.wishlist.flatMap(w => {
    if (!wishIds.has(w.id)) {
      skipped.push(`wishlist item ${w.id}: not found`)
      return []
    }
    const stop = w.covered_by_stop_id && stopIds.has(w.covered_by_stop_id) ? w.covered_by_stop_id : null
    return [{ id: w.id, status: w.status, check_note: w.check_note, covered_by_stop_id: stop, checked_at: now }]
  })

  const placeInserts: PlaceInsert[] = []
  for (const s of result.suggestions) {
    const key = s.name.trim().toLowerCase()
    if (s.stop_id && !stopIds.has(s.stop_id)) {
      skipped.push(`suggestion ${s.name}: stop ${s.stop_id} not found`)
      continue
    }
    if (names.has(key)) {
      skipped.push(`suggestion ${s.name}: a place with that name already exists`)
      continue
    }
    names.add(key)
    placeInserts.push({
      stop_id: s.stop_id,
      name: s.name.trim(),
      lat: s.lat,
      lng: s.lng,
      note: s.note || null,
      source: 'claude',
      status: 'suggested',
      wishlist_item_id: s.wishlist_item_id && wishIds.has(s.wishlist_item_id) ? s.wishlist_item_id : null,
    })
  }

  return { wishlistUpdates, placeInserts, skipped }
}

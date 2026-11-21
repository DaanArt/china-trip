// The wishlist check, run by Claude in a Claude Code session.
//   npx tsx scripts/trip-check.ts export            → prints the plan + wishlist as JSON
//   npx tsx scripts/trip-check.ts apply <file.json> → writes check results (see CheckResult)
// Signs in with Claude's own account (.env.claude), so the database access rules apply.
// It only ever updates wishlist items and inserts suggested places.
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { planCheckWrites, type CheckResult } from '../src/domain/checkApply'
import { buildRoute } from '../src/domain/route'
import type { Leg, Place, Profile, Stop, Trip, WishlistItem } from '../src/domain/types'

process.loadEnvFile('.env')
if (existsSync('.env.claude')) process.loadEnvFile('.env.claude')

const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
})

async function all<T>(table: string): Promise<T[]> {
  const { data, error } = await client.from(table).select('*').order(table === 'trip' ? 'start_date' : 'created_at')
  if (error) throw new Error(`${table}: ${error.message}`)
  return data as T[]
}

async function load() {
  const [trips, stops, legs, places, wishlist] = await Promise.all([
    all<Trip>('trip'),
    all<Stop>('stops'),
    all<Leg>('legs'),
    all<Place>('places'),
    all<WishlistItem>('wishlist_items'),
  ])
  return { trip: trips[0], stops, legs, places, wishlist }
}

async function main() {
  const [command, file] = process.argv.slice(2)
  const { data: auth, error } = await client.auth.signInWithPassword({
    email: process.env.CLAUDE_EMAIL!,
    password: process.env.CLAUDE_PASSWORD!,
  })
  if (error || !auth.user) throw new Error(`Sign-in failed: ${error?.message}`)

  const data = await load()

  if (command === 'export') {
    const route = buildRoute(data.trip, data.stops, data.legs)
    const out = {
      trip: data.trip,
      route: {
        stops: route.stops.map(s => ({ id: s.stop.id, name: s.stop.name, lat: s.stop.lat, lng: s.stop.lng, start: s.start, end: s.end, nights: s.nights, notes: s.stop.notes })),
        legs: route.legs.map(l => ({ key: l.key, from: l.from?.name ?? data.trip.home_label, to: l.to?.name ?? data.trip.home_label, date: l.date, mode: l.mode, overnight: l.overnight })),
        unplannedNights: route.unplannedNights,
      },
      places: data.places.map(({ id, name, stop_id, status, source, lat, lng, note, wishlist_item_id }) => ({ id, name, stop_id, status, source, lat, lng, note, wishlist_item_id })),
      wishlist: data.wishlist.map(({ id, text, note, status, check_note }) => ({ id, text, note, status, check_note })),
    }
    console.log(JSON.stringify(out, null, 2))
    return
  }

  if (command === 'apply' && file) {
    const result = JSON.parse(readFileSync(file, 'utf8')) as CheckResult
    const plan = planCheckWrites({ wishlist: result.wishlist ?? [], suggestions: result.suggestions ?? [] }, data, new Date().toISOString())
    for (const u of plan.wishlistUpdates) {
      const { id, ...patch } = u
      const { error } = await client.from('wishlist_items').update(patch).eq('id', id)
      if (error) throw new Error(`wishlist ${id}: ${error.message}`)
    }
    if (plan.placeInserts.length) {
      const rows = plan.placeInserts.map(p => ({ ...p, trip_id: data.trip.id }))
      const { error } = await client.from('places').insert(rows)
      if (error) throw new Error(`places: ${error.message}`)
    }
    const { data: me } = await client.from('profiles').select('*').eq('id', auth.user.id)
    if (!(me as Profile[] | null)?.length) await client.from('profiles').insert({ id: auth.user.id, display_name: 'Claude' })

    console.log(`Updated ${plan.wishlistUpdates.length} wishlist item(s), added ${plan.placeInserts.length} suggestion(s).`)
    for (const s of plan.skipped) console.log(`Skipped: ${s}`)
    return
  }

  console.error('Usage: tsx scripts/trip-check.ts export | apply <file.json>')
  process.exit(2)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})

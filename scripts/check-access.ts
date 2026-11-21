// Access smoke test against the real Supabase project.
// Anonymous visitors must see and change nothing; the Claude account must
// be able to read the trip. Run: npm run check-access
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.production')
if (existsSync('.env.claude')) process.loadEnvFile('.env.claude')

const url = process.env.VITE_SUPABASE_URL!
const key = process.env.VITE_SUPABASE_ANON_KEY!
const TABLES = ['trip', 'profiles', 'stops', 'legs', 'reservations', 'attachments', 'wishlist_items', 'places']

let failed = 0
function report(ok: boolean, name: string, detail = '') {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

const anon = createClient(url, key, { auth: { persistSession: false } })

for (const table of TABLES) {
  const { data, error } = await anon.from(table).select('*').limit(5)
  report(!!error || (data ?? []).length === 0, `anon cannot read ${table}`, error ? 'refused' : `${data?.length ?? 0} rows`)
}

{
  const { error } = await anon
    .from('stops')
    .insert({ trip_id: '00000000-0000-0000-0000-000000000000', position: 1, name: 'x', lat: 0, lng: 0 })
  report(!!error, 'anon cannot insert into stops')
}

{
  const { data, error } = await anon.storage.from('attachments').list()
  report(!!error || (data ?? []).length === 0, 'anon cannot list attachments')
}

{
  // Read the auth settings instead of attempting a sign-up (no side effects).
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
  const settings = (await res.json()) as { disable_signup?: boolean }
  report(settings.disable_signup === true, 'strangers cannot sign up', `disable_signup=${settings.disable_signup}`)
}

if (process.env.CLAUDE_EMAIL && process.env.CLAUDE_PASSWORD) {
  const claude = createClient(url, key, { auth: { persistSession: false } })
  const { error: loginError } = await claude.auth.signInWithPassword({
    email: process.env.CLAUDE_EMAIL,
    password: process.env.CLAUDE_PASSWORD,
  })
  report(!loginError, 'Claude account can sign in', loginError?.message ?? '')
  const { data } = await claude.from('trip').select('*')
  report((data ?? []).length === 1, 'Claude account reads the trip', `${data?.length ?? 0} rows`)
} else {
  report(false, 'Claude account can sign in', '.env.claude missing CLAUDE_EMAIL/CLAUDE_PASSWORD')
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)

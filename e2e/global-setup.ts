// e2e must never touch the live trip: refuse any Supabase that isn't local,
// then make sure the local test account exists.
import { createClient } from '@supabase/supabase-js'
import { CLAUDE } from './helpers'

export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL ?? ''
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)) {
    throw new Error(`e2e only runs against a local Supabase (got "${url}"). Start one with \`npx supabase start\`.`)
  }
  const admin = createClient(url, process.env.SUPABASE_LOCAL_SERVICE_KEY!, { auth: { persistSession: false } })
  const { error } = await admin.auth.admin.createUser({ ...CLAUDE, email_confirm: true })
  if (error && !/already/i.test(error.message)) throw new Error(`local test user: ${error.message}`)

  // A second local traveller, so assignee features have someone other than Claude.
  const second = { email: 'cynthia@china-trip.invalid', password: 'local-e2e-only-password' }
  const created = await admin.auth.admin.createUser({ ...second, email_confirm: true })
  if (created.error && !/already/i.test(created.error.message)) throw new Error(`second test user: ${created.error.message}`)
  const { data: users } = await admin.auth.admin.listUsers()
  const id = users.users.find(u => u.email === second.email)!.id
  await admin.from('profiles').upsert({ id, display_name: 'Cynthia (test)' })
}

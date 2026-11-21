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
}

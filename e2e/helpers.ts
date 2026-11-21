import { existsSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env')
if (existsSync('.env.claude')) process.loadEnvFile('.env.claude')

export const CLAUDE = { email: process.env.CLAUDE_EMAIL!, password: process.env.CLAUDE_PASSWORD! }
/** Every row an e2e test creates starts with this, so cleanup can find it. */
export const PREFIX = 'E2E '

export async function login(page: Page) {
  await page.goto('./')
  await page.getByLabel('Email').fill(CLAUDE.email)
  await page.getByLabel('Password').fill(CLAUDE.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  const prompt = page.getByLabel('What should we call you?')
  const header = page.locator('.topbar')
  await expect(prompt.or(header)).toBeVisible()
  if (await prompt.isVisible()) {
    await prompt.fill('Claude')
    await page.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(header).toContainText('China 2027')
}

let shared: ReturnType<typeof createClient> | null = null

/** Signed-in client (as the Claude account) for setup and cleanup. Signs in once
 *  per worker to stay under Supabase's sign-in rate limit. */
export async function db() {
  if (shared) return shared
  const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword(CLAUDE)
  if (error) throw new Error(`e2e helper sign-in failed: ${error.message}`)
  shared = client
  return client
}

export async function cleanup() {
  const client = await db()
  await client.from('stops').delete().like('name', `${PREFIX}%`)
  await client.from('places').delete().like('name', `${PREFIX}%`)
  await client.from('wishlist_items').delete().like('text', `${PREFIX}%`)
}

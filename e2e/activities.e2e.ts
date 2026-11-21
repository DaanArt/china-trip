import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { PREFIX, cleanup, db, login } from './helpers'

const CYNTHIA = { email: 'cynthia@china-trip.invalid', password: 'local-e2e-only-password' }

async function stopWith(name: string, titles: string[] = []) {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  const stop = (await client.from('stops').insert({ trip_id: trip!.id, name, lat: 30.6, lng: 104.1, nights: 2, position: 950 }).select().single()).data!
  const acts = []
  for (const [i, title] of titles.entries()) {
    acts.push((await client.from('activities').insert({ trip_id: trip!.id, stop_id: stop.id, title, created_at: `2026-11-21T0${i}:00:00Z` }).select().single()).data!)
  }
  return { client, stop, acts }
}
async function openActivities(page: Page, stopName: string) {
  await page.getByRole('button', { name: stopName, exact: true }).click()
  await page.getByRole('tab', { name: /^Activities/ }).click()
}
const cards = (page: Page) => page.locator('article.activity')

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('adds an activity whose notes link out', async ({ page }) => {
  await stopWith(`${PREFIX}Chengdu`)
  await login(page)
  await openActivities(page, `${PREFIX}Chengdu`)
  await page.getByLabel('Activity').fill(`${PREFIX}Panda Base`)
  await page.getByLabel('Notes').fill('Tickets https://example.com/pandas, go at 7:30.')
  await page.getByRole('button', { name: 'Add activity' }).click()
  const link = page.getByRole('article', { name: `${PREFIX}Panda Base` }).getByRole('link', { name: 'https://example.com/pandas' })
  await expect(link).toHaveAttribute('href', 'https://example.com/pandas')
  await expect(link).toHaveAttribute('target', '_blank')
})

test('hearts reorder the list', async ({ page }) => {
  await stopWith(`${PREFIX}Votes`, [`${PREFIX}Older`, `${PREFIX}Newer`])
  await login(page)
  await openActivities(page, `${PREFIX}Votes`)
  await expect(cards(page).first()).toHaveAttribute('aria-label', `${PREFIX}Older`)
  await page.getByRole('article', { name: `${PREFIX}Newer` }).getByRole('button', { name: 'Give 3 hearts' }).click()
  await expect(cards(page).first()).toHaveAttribute('aria-label', `${PREFIX}Newer`)
  await expect(page.getByRole('article', { name: `${PREFIX}Newer` })).toContainText('3')
})

test("the other traveller's hearts are shown but can't be changed, not even through the API", async ({ page }) => {
  const { client, acts } = await stopWith(`${PREFIX}Theirs`, [`${PREFIX}Opera`])
  const cyn = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: me } = await cyn.auth.signInWithPassword(CYNTHIA)
  await cyn.from('activity_votes').insert({ activity_id: acts[0].id, hearts: 2 })

  const sneaky = await client.from('activity_votes').upsert({ activity_id: acts[0].id, user_id: me.user!.id, hearts: 0 })
  expect(sneaky.error).not.toBeNull()

  await login(page)
  await openActivities(page, `${PREFIX}Theirs`)
  const row = page.getByLabel('Cynthia (test): 2 hearts')
  await expect(row).toBeVisible()
  await expect(row.getByRole('button')).toHaveCount(0)
})

test('an activity can hold a booking with a file', async ({ page }) => {
  await stopWith(`${PREFIX}Booked`, [`${PREFIX}Show`])
  await login(page)
  await openActivities(page, `${PREFIX}Booked`)
  const card = page.getByRole('article', { name: `${PREFIX}Show` })
  await card.getByRole('button', { name: 'Add reservation' }).click()
  await expect(page.getByLabel('Kind')).toHaveValue('activity')
  await page.getByLabel('Title').fill(`${PREFIX}Opera tickets`)
  await page.getByRole('button', { name: 'Save reservation' }).click()
  const booking = page.getByRole('article', { name: `${PREFIX}Opera tickets` })
  await booking.getByLabel('Attach file').setInputFiles({ name: 'tickets.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') })
  await expect(booking.getByRole('button', { name: 'tickets.pdf', exact: true })).toBeVisible({ timeout: 10_000 })
})

test('deleting a stop mentions its activities', async ({ page }) => {
  await stopWith(`${PREFIX}Doomed`, [`${PREFIX}One`, `${PREFIX}Two`])
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Doomed`, exact: true }).click()
  let message = ''
  page.once('dialog', d => {
    message = d.message()
    d.dismiss()
  })
  await page.getByRole('button', { name: 'Delete stop' }).click()
  await expect.poll(() => message).toBe(`Delete ${PREFIX}Doomed and its 2 activities?`)
})

test('a booking can only belong to one thing', async () => {
  const { client, stop, acts } = await stopWith(`${PREFIX}Strict`, [`${PREFIX}Act`])
  const { error } = await client.from('reservations').insert({ trip_id: stop.trip_id, stop_id: stop.id, activity_id: acts[0].id, kind: 'activity', title: 'x' })
  expect(error?.message).toContain('reservations_one_target')
})

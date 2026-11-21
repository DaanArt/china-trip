import { expect, test } from '@playwright/test'
import { PREFIX, cleanup, db, login } from './helpers'

async function trip() {
  const client = await db()
  const { data } = await client.from('trip').select('id').single()
  return { client, tripId: data!.id as string }
}
async function addStop(name: string, position = 700) {
  const { client, tripId } = await trip()
  return (await client.from('stops').insert({ trip_id: tripId, name, lat: 30.57, lng: 104.07, nights: 2, position }).select().single()).data!
}
async function addPlace(row: Record<string, unknown>) {
  const { client, tripId } = await trip()
  return (await client.from('places').insert({ trip_id: tripId, lat: 30.6, lng: 104.1, ...row }).select().single()).data!
}

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('the to-do list names missing hotels and opens the stop', async ({ page }) => {
  await addStop(`${PREFIX}Todo`)
  await login(page)
  await page.getByRole('tab', { name: /To do/ }).click()
  const item = page.getByRole('button', { name: new RegExp(`^Book hotel in ${PREFIX}Todo`) })
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByRole('heading', { name: `${PREFIX}Todo` })).toBeVisible()
  await page.getByLabel('No hotel needed').check()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('tab', { name: /To do/ }).click()
  await expect(item).toHaveCount(0)
})

test('an idea pin becomes a new stop', async ({ page }) => {
  await addPlace({ name: `${PREFIX}Idea`, stop_id: null })
  await login(page)
  await page.getByRole('tab', { name: 'Wishlist' }).click()
  await page.getByRole('button', { name: `${PREFIX}Idea`, exact: true }).click()
  await page.getByRole('button', { name: 'Add as new stop' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('tab', { name: 'Route' }).click()
  await expect(page.getByRole('listitem', { name: `Stop ${PREFIX}Idea` })).toBeVisible()
})

test('a suggestion can be attached to a stop or dismissed', async ({ page }) => {
  await addStop(`${PREFIX}Chengdu`)
  await addPlace({ name: `${PREFIX}Pandas`, stop_id: null, status: 'suggested', source: 'claude' })
  await addPlace({ name: `${PREFIX}Meh`, stop_id: null, status: 'suggested', source: 'claude' })
  await login(page)
  await page.getByRole('tab', { name: 'Wishlist' }).click()

  await page.getByRole('button', { name: `${PREFIX}Meh`, exact: true }).click()
  await expect(page.getByText('Suggested by Claude')).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await page.getByRole('tab', { name: 'Wishlist' }).click()
  await expect(page.getByRole('button', { name: `${PREFIX}Meh`, exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: `${PREFIX}Pandas`, exact: true }).click()
  await page.getByLabel('Attach to stop').selectOption({ label: `${PREFIX}Chengdu` })
  await page.getByRole('button', { name: 'Attach' }).click()
  await page.getByRole('tab', { name: 'Route' }).click()
  await page.getByRole('button', { name: `${PREFIX}Chengdu`, exact: true }).click()
  await expect(page.getByRole('region', { name: 'Places' })).toContainText(`${PREFIX}Pandas`)
})

test('adds a place to a stop by search', async ({ page }) => {
  await addStop(`${PREFIX}Base`)
  await page.route('**/photon.komoot.io/api/**', route =>
    route.fulfill({ json: { features: [{ geometry: { coordinates: [104.05, 30.67] }, properties: { name: `${PREFIX}Jinli`, city: 'Chengdu', country: 'China' } }] } }),
  )
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Base`, exact: true }).click()
  await page.getByRole('button', { name: 'Add place' }).click()
  await page.getByLabel('Search a place').fill('jinli')
  await page.getByLabel('Search a place').press('Enter')
  await page.getByRole('button', { name: `${PREFIX}Jinli, Chengdu, China` }).click()
  await expect(page.getByRole('region', { name: 'Places' })).toContainText(`${PREFIX}Jinli`)
})

test('deleting a stop keeps its places as idea pins', async ({ page }) => {
  const stop = await addStop(`${PREFIX}Doomed`)
  await addPlace({ name: `${PREFIX}Survivor`, stop_id: stop.id })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Doomed`, exact: true }).click()
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Delete stop' }).click()
  await page.getByRole('tab', { name: 'Wishlist' }).click()
  await expect(page.getByRole('button', { name: `${PREFIX}Survivor`, exact: true })).toBeVisible()
})

test('the wishlist shows check results', async ({ page }) => {
  const { client, tripId } = await trip()
  await client.from('wishlist_items').insert({ trip_id: tripId, text: `${PREFIX}See pandas`, status: 'covered', check_note: 'Chengdu, day 9' })
  await login(page)
  await page.getByRole('tab', { name: 'Wishlist' }).click()
  await page.getByLabel('New wish').fill(`${PREFIX}Hotpot`)
  await page.getByLabel('New wish').press('Enter')
  await expect(page.getByRole('listitem', { name: `${PREFIX}Hotpot` })).toContainText('Not checked yet')
  await expect(page.getByRole('listitem', { name: `${PREFIX}See pandas` })).toContainText('Covered: Chengdu, day 9')
})

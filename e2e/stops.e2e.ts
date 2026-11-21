import { expect, test, type Page } from '@playwright/test'
import { PREFIX, cleanup, db, login } from './helpers'

const photon = {
  features: [{ geometry: { coordinates: [116.4074, 39.9042] }, properties: { name: `${PREFIX}Beijing`, country: 'China' } }],
}

async function addStopRows(names: string[]) {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  const { data: existing } = await client.from('stops').select('position')
  let position = Math.max(0, ...(existing ?? []).map(s => s.position))
  const rows = names.map((name, i) => ({ trip_id: trip!.id, name, lat: 30 + i, lng: 110 + i, nights: 2, position: ++position }))
  const { data } = await client.from('stops').insert(rows).select()
  return data!
}

const stopRow = (page: Page, name: string) => page.getByRole('listitem', { name: `Stop ${name}` })
const datesOf = (page: Page, name: string) => stopRow(page, name).locator('.dates').innerText()

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('adds a stop by searching for a place', async ({ page }) => {
  await page.route('**/photon.komoot.io/api/**', route => route.fulfill({ json: photon }))
  await login(page)
  await page.getByRole('button', { name: 'Add stop' }).click()
  await page.getByLabel('Search a place').fill('beijing')
  await page.getByLabel('Search a place').press('Enter')
  await page.getByRole('button', { name: `${PREFIX}Beijing, China` }).click()
  await expect(stopRow(page, `${PREFIX}Beijing`)).toBeVisible()
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible()
})

test('changing nights shifts the next stop', async ({ page }) => {
  await addStopRows([`${PREFIX}A`, `${PREFIX}B`])
  await login(page)
  const before = await datesOf(page, `${PREFIX}B`)
  await page.getByLabel(`Nights in ${PREFIX}A`).fill('4')
  await page.getByLabel(`Nights in ${PREFIX}A`).blur()
  await expect.poll(() => datesOf(page, `${PREFIX}B`)).not.toBe(before)
})

test('marking a leg overnight starts the next stop a day later', async ({ page }) => {
  await addStopRows([`${PREFIX}A`, `${PREFIX}B`])
  await login(page)
  const before = await datesOf(page, `${PREFIX}B`)
  await page.getByRole('button', { name: `Leg ${PREFIX}A → ${PREFIX}B` }).click()
  await page.getByLabel('Overnight').check()
  await expect(page.locator('.panel')).toContainText('overnight')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: `Leg ${PREFIX}A → ${PREFIX}B` })).toContainText('overnight')
  await expect.poll(() => datesOf(page, `${PREFIX}B`)).not.toBe(before)
})

test('moving a stop down reorders the route', async ({ page }) => {
  await addStopRows([`${PREFIX}A`, `${PREFIX}B`])
  await login(page)
  await page.getByRole('button', { name: `Move ${PREFIX}A down` }).click()
  const names = page.getByRole('listitem', { name: /^Stop E2E / })
  await expect(names.nth(0)).toHaveAccessibleName(`Stop ${PREFIX}B`)
  await expect(names.nth(1)).toHaveAccessibleName(`Stop ${PREFIX}A`)
})

test('deleting a stop with a reservation asks first, with the count', async ({ page }) => {
  const [a] = await addStopRows([`${PREFIX}A`])
  const client = await db()
  await client.from('reservations').insert({ trip_id: a.trip_id, stop_id: a.id, kind: 'hotel', title: 'Hotel' })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}A`, exact: true }).click()
  let message = ''
  page.once('dialog', d => {
    message = d.message()
    d.accept()
  })
  await page.getByRole('button', { name: 'Delete stop' }).click()
  await expect(stopRow(page, `${PREFIX}A`)).toHaveCount(0)
  expect(message).toBe(`Delete ${PREFIX}A and its 1 reservation?`)
})

test('a stop added elsewhere appears without reloading', async ({ page }) => {
  await login(page)
  await addStopRows([`${PREFIX}Live`])
  await expect(stopRow(page, `${PREFIX}Live`)).toBeVisible({ timeout: 10_000 })
})

test('the map is built in: no tile servers, no Google', async ({ page }) => {
  const hosts: string[] = []
  page.on('request', r => hosts.push(new URL(r.url()).host))
  await login(page)
  await expect(page.locator('path.china-shape').first()).toBeAttached()
  await page.waitForTimeout(500)
  expect(hosts.filter(h => /tile|openstreetmap|openfreemap|carto|google|gstatic/.test(h))).toEqual([])
})

test('stops show as numbered pins with their name', async ({ page }) => {
  await addStopRows([`${PREFIX}Pinned`])
  await login(page)
  const pin = page.locator('.stop-pin').filter({ hasText: /^\d+$/ }).last()
  await expect(pin).toBeVisible()
  await expect(page.locator('.stop-label', { hasText: `${PREFIX}Pinned` })).toBeVisible()
})

test('idea pins use the lighter pin', async ({ page }) => {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  await client.from('places').insert({ trip_id: trip!.id, name: `${PREFIX}Idea pin`, lat: 31, lng: 112, stop_id: null })
  await login(page)
  await expect(page.locator('.pin-idea').first()).toBeVisible()
})

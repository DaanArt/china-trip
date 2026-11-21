import { expect, test } from '@playwright/test'
import { PREFIX, cleanup, db, login } from './helpers'

test.beforeEach(async () => {
  await cleanup()
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  // Position far below any real stop so this is the first stop of the route.
  await client.from('stops').insert({ trip_id: trip!.id, name: `${PREFIX}First`, lat: 39.9, lng: 116.4, nights: 3, position: -1000 })
})
test.afterAll(cleanup)

test('steps through the days and shows where you are', async ({ page }) => {
  await login(page)
  const label = page.locator('.timelapse-label')
  await expect(label).toContainText('Day 1 · 17 Apr')
  await page.getByRole('button', { name: 'Next day' }).click()
  await expect(label).toHaveText(`Day 2 · 18 Apr · ${PREFIX}First`)
  await expect(page.locator('path.timelapse-marker')).toHaveCount(1)
  await page.getByLabel('Day', { exact: true }).fill('61')
  await expect(label).toContainText('Day 62 · 17 Jun')
})

test('play advances the days by itself', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.locator('.timelapse-label')).toContainText(/Day [3-9]/, { timeout: 6000 })
  await page.getByRole('button', { name: 'Pause' }).click()
})

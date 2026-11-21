import { expect, test } from '@playwright/test'
import { PREFIX, cleanup, db, login } from './helpers'

async function addStops(names: string[]) {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  const rows = names.map((name, i) => ({ trip_id: trip!.id, name, lat: 30 + i, lng: 110 + i, nights: 2, position: 500 + i }))
  return (await client.from('stops').insert(rows).select()).data!
}

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('adds a hotel to a stop with prefilled stay dates', async ({ page }) => {
  await addStops([`${PREFIX}Hotelstop`])
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Hotelstop`, exact: true }).click()
  await page.getByRole('button', { name: 'Add reservation' }).click()
  await expect(page.getByLabel('Kind')).toHaveValue('hotel')
  await expect(page.getByLabel('Check-in', { exact: true })).not.toHaveValue('')
  await expect(page.getByLabel('Check-out', { exact: true })).not.toHaveValue('')
  await page.getByLabel('Title').fill(`${PREFIX}Panda Inn`)
  await page.getByLabel('Confirmation').fill('ABC123')
  await page.getByRole('button', { name: 'Save reservation' }).click()
  const card = page.getByRole('article', { name: `${PREFIX}Panda Inn` })
  await expect(card).toContainText('ABC123')
  await expect(card).toContainText('added by Claude')
})

test('adds a train to a leg that has no stored data yet', async ({ page }) => {
  await addStops([`${PREFIX}From`, `${PREFIX}To`])
  await login(page)
  await page.getByRole('button', { name: `Leg ${PREFIX}From → ${PREFIX}To` }).click()
  await page.getByRole('button', { name: 'Add reservation' }).click()
  await expect(page.getByLabel('Kind')).toHaveValue('transport')
  await expect(page.getByLabel('Departs', { exact: true })).not.toHaveValue('')
  await page.getByLabel('Title').fill(`${PREFIX}G87`)
  await page.getByRole('button', { name: 'Save reservation' }).click()
  await expect(page.getByRole('article', { name: `${PREFIX}G87` })).toBeVisible()
})

test('edits a reservation', async ({ page }) => {
  const [stop] = await addStops([`${PREFIX}Edit`])
  const client = await db()
  await client.from('reservations').insert({ trip_id: stop.trip_id, stop_id: stop.id, kind: 'hotel', title: `${PREFIX}Old` })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Edit`, exact: true }).click()
  await page.getByRole('article', { name: `${PREFIX}Old` }).getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Title').fill(`${PREFIX}New`)
  await page.getByRole('button', { name: 'Save reservation' }).click()
  await expect(page.getByRole('article', { name: `${PREFIX}New` })).toBeVisible()
})

test('uploads, opens and removes an attachment with its reservation', async ({ page, context }) => {
  const [stop] = await addStops([`${PREFIX}Files`])
  const client = await db()
  const { data: r } = await client
    .from('reservations')
    .insert({ trip_id: stop.trip_id, stop_id: stop.id, kind: 'hotel', title: `${PREFIX}With file` })
    .select()
    .single()
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Files`, exact: true }).click()
  const card = page.getByRole('article', { name: `${PREFIX}With file` })
  await card.getByLabel('Attach file').setInputFiles({ name: 'ticket.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })
  await expect(card.getByRole('button', { name: 'ticket.pdf', exact: true })).toBeVisible({ timeout: 10_000 })

  // Headless Chrome downloads PDFs rather than showing them, so check the request.
  const signed = context.waitForEvent('request', r => r.url().includes('/object/sign/attachments/') && r.url().includes('token='))
  await card.getByRole('button', { name: 'ticket.pdf', exact: true }).click()
  await signed

  page.once('dialog', d => d.accept())
  await card.getByRole('button', { name: 'Delete' }).click()
  await expect(card).toHaveCount(0)
  const { data: left } = await client.storage.from('attachments').list(r!.id)
  expect(left ?? []).toEqual([])
})

import { expect, test } from '@playwright/test'
import { PREFIX, cleanup, db, login } from './helpers'

async function setup(names: string[]) {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  const rows = names.map((name, i) => ({ trip_id: trip!.id, name, lat: 30 + i, lng: 110 + i, nights: 2, position: 800 + i }))
  const stops = (await client.from('stops').insert(rows).select().order('position')).data!
  return { client, tripId: trip!.id as string, stops }
}

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('a stop with a booked journey cannot be deleted until the booking is handled', async ({ page }) => {
  const { client, tripId, stops: [a, b] } = await setup([`${PREFIX}From`, `${PREFIX}Mid`])
  const { data: leg } = await client.from('legs').insert({ trip_id: tripId, from_stop_id: a.id, to_stop_id: b.id }).select().single()
  await client.from('reservations').insert({ trip_id: tripId, leg_id: leg!.id, kind: 'transport', title: `${PREFIX}G87` })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Mid`, exact: true }).click()
  let message = ''
  page.once('dialog', d => {
    message = d.message()
    d.accept()
  })
  await page.getByRole('button', { name: 'Delete stop' }).click()
  await expect.poll(() => message).toContain(`${PREFIX}From → ${PREFIX}Mid`)
  await expect(page.getByRole('heading', { name: `${PREFIX}Mid` })).toBeVisible()
  const { data: still } = await client.from('reservations').select('id').eq('title', `${PREFIX}G87`)
  expect(still).toHaveLength(1)
})

test('deleting a stop also removes its booking files from storage', async ({ page }) => {
  const { client, tripId, stops: [a] } = await setup([`${PREFIX}Files`])
  const { data: r } = await client.from('reservations').insert({ trip_id: tripId, stop_id: a.id, kind: 'hotel', title: `${PREFIX}Inn` }).select().single()
  const path = `${r!.id}/test.pdf`
  await client.storage.from('attachments').upload(path, new Blob(['%PDF']), { contentType: 'application/pdf' })
  await client.from('attachments').insert({ reservation_id: r!.id, storage_path: path, filename: 'test.pdf' })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Files`, exact: true }).click()
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Delete stop' }).click()
  await expect(page.getByRole('tab', { name: 'Route' })).toBeVisible()
  await expect.poll(async () => (await client.storage.from('attachments').list(r!.id)).data ?? []).toEqual([])
})

test('a booking on a journey that left the route can be opened and deleted', async ({ page }) => {
  const { client, tripId, stops: [a, , c] } = await setup([`${PREFIX}A`, `${PREFIX}B`, `${PREFIX}C`])
  const { data: leg } = await client.from('legs').insert({ trip_id: tripId, from_stop_id: a.id, to_stop_id: c.id }).select().single()
  await client.from('reservations').insert({ trip_id: tripId, leg_id: leg!.id, kind: 'transport', title: `${PREFIX}Old train` })
  await login(page)
  await page.getByRole('tab', { name: /To do/ }).click()
  await page.getByRole('button', { name: /^Suggestions \(\d+\)/ }).click()
  await page.getByRole('button', { name: `Booking ${PREFIX}A → ${PREFIX}C no longer matches the route` }).click()
  await expect(page.getByText('no longer on the route')).toBeVisible()
  page.once('dialog', d => d.accept())
  await page.getByRole('article', { name: `${PREFIX}Old train` }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('article', { name: `${PREFIX}Old train` })).toHaveCount(0)
})

test('an open text field picks up the other person’s edit instead of overwriting it', async ({ page }) => {
  const { client, stops: [a] } = await setup([`${PREFIX}Rename`])
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Rename`, exact: true }).click()
  await client.from('stops').update({ name: `${PREFIX}Renamed`, notes: 'from Cynthia' }).eq('id', a.id)
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(`${PREFIX}Renamed`, { timeout: 10_000 })
  await page.getByLabel('Notes').focus()
  await page.getByLabel('Notes').blur()
  await expect(page.getByLabel('Notes')).toHaveValue('from Cynthia')
})

test('coming back to the tab reloads changes missed while the live connection was down', async ({ page }) => {
  await page.routeWebSocket(/realtime/, () => {}) // live updates never connect
  await login(page)
  await setup([`${PREFIX}Missed`])
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('listitem', { name: `Stop ${PREFIX}Missed` })).toBeVisible()
})

test('a file with Chinese characters and symbols in its name uploads', async ({ page }) => {
  const { client, tripId, stops: [a] } = await setup([`${PREFIX}Unicode`])
  await client.from('reservations').insert({ trip_id: tripId, stop_id: a.id, kind: 'hotel', title: `${PREFIX}Hotel` })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Unicode`, exact: true }).click()
  const card = page.getByRole('article', { name: `${PREFIX}Hotel` })
  await card.getByLabel('Attach file').setInputFiles({ name: '订单确认 #2.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') })
  await expect(card.getByRole('button', { name: '订单确认 #2.pdf', exact: true })).toBeVisible({ timeout: 10_000 })
})

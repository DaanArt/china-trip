import { expect, test } from '@playwright/test'
import { PREFIX, cleanup, db, login } from './helpers'

async function addStop(name: string) {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  return (await client.from('stops').insert({ trip_id: trip!.id, name, lat: 30.6, lng: 104.1, nights: 2, position: 900 }).select().single()).data!
}
const openCount = async (page: import('@playwright/test').Page) =>
  Number((await page.getByRole('tab', { name: /To do/ }).innerText()).match(/\((\d+)\)/)?.[1] ?? -1)

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('adds an own to-do with who, stop and due date; ticking moves it to Done', async ({ page }) => {
  await addStop(`${PREFIX}Chengdu`)
  await login(page)
  await page.getByRole('tab', { name: /To do/ }).click()
  const before = await openCount(page)
  await page.getByLabel('New to-do').fill(`${PREFIX}Get visas`)
  await page.getByRole('checkbox', { name: 'Cynthia (test)' }).check()
  await page.getByLabel('Stop').selectOption({ label: `${PREFIX}Chengdu` })
  await page.getByLabel('Due').fill('2027-01-15')
  await page.getByRole('button', { name: 'Add to-do' }).click()

  const item = page.getByRole('listitem', { name: `${PREFIX}Get visas` })
  await expect(item).toContainText(`${PREFIX}Chengdu`)
  await expect(item).toContainText('15 Jan')
  await expect(item).toContainText('Cynthia (test)')
  await expect.poll(() => openCount(page)).toBe(before + 1)

  await item.getByRole('checkbox', { name: 'Done' }).check()
  await expect(page.getByRole('button', { name: /^Done \(\d+\)/ })).toBeVisible()
  await expect.poll(() => openCount(page)).toBe(before)
})

test('suggestions are collapsed and can be copied to our list', async ({ page }) => {
  await addStop(`${PREFIX}Xian`)
  await login(page)
  await page.getByRole('tab', { name: /To do/ }).click()
  const suggestion = page.getByRole('button', { name: new RegExp(`^Book hotel in ${PREFIX}Xian`) })
  await expect(suggestion).toHaveCount(0)
  await page.getByRole('button', { name: /^Suggestions \(\d+\)/ }).click()
  await expect(suggestion).toBeVisible()
  const row = page.getByRole('listitem').filter({ has: suggestion })
  await row.getByRole('button', { name: 'Add to our list' }).click()
  await expect(row).toContainText('on our list')
  await expect(page.getByRole('listitem', { name: new RegExp(`^Book hotel in ${PREFIX}Xian`) }).first()).toBeVisible()
})

test('a to-do linked to a stop shows on the stop page', async ({ page }) => {
  const stop = await addStop(`${PREFIX}Linked`)
  const client = await db()
  await client.from('tasks').insert({ trip_id: stop.trip_id, text: `${PREFIX}Buy panda tickets`, stop_id: stop.id })
  await login(page)
  await page.getByRole('button', { name: `${PREFIX}Linked`, exact: true }).click()
  await expect(page.getByRole('region', { name: 'To-dos' })).toContainText(`${PREFIX}Buy panda tickets`)
})

test('an own to-do can be edited: text, who, stop and due date', async ({ page }) => {
  const stop = await addStop(`${PREFIX}Edit stop`)
  const client = await db()
  await client.from('tasks').insert({ trip_id: stop.trip_id, text: `${PREFIX}Old text` })
  await login(page)
  await page.getByRole('tab', { name: /To do/ }).click()
  await page.getByRole('listitem', { name: `${PREFIX}Old text` }).getByRole('button', { name: 'Edit' }).click()
  const form = page.getByRole('form', { name: 'Edit to-do' })
  await form.getByLabel('To-do').fill(`${PREFIX}New text`)
  await form.getByRole('checkbox', { name: 'Cynthia (test)' }).check()
  await form.getByLabel('Stop').selectOption({ label: `${PREFIX}Edit stop` })
  await form.getByLabel('Due').fill('2027-02-03')
  await form.getByRole('button', { name: 'Save to-do' }).click()
  const item = page.getByRole('listitem', { name: `${PREFIX}New text` })
  await expect(item).toContainText('3 Feb')
  await expect(item).toContainText('Cynthia (test)')
  await expect(item).toContainText(`${PREFIX}Edit stop`)
  await expect(page.getByRole('listitem', { name: `${PREFIX}Old text` })).toHaveCount(0)
})

import { expect, test, type Locator, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { PREFIX, cleanup, db, login } from './helpers'

async function seed() {
  const client = await db()
  const { data: trip } = await client.from('trip').select('id').single()
  const t = trip!.id
  const stop = (await client.from('stops').insert({ trip_id: t, name: `${PREFIX}Talk`, lat: 30, lng: 104, nights: 2, position: 980 }).select().single()).data!
  const wish = (await client.from('wishlist_items').insert({ trip_id: t, text: `${PREFIX}Wish` }).select().single()).data!
  const activity = (await client.from('activities').insert({ trip_id: t, stop_id: stop.id, title: `${PREFIX}Activity` }).select().single()).data!
  const task = (await client.from('tasks').insert({ trip_id: t, text: `${PREFIX}Task` }).select().single()).data!
  return { client, t, stop, wish, activity, task }
}
async function post(scope: Locator, text: string) {
  await scope.getByRole('button', { name: /^💬 Comments/ }).click()
  await scope.getByLabel('Add a comment').fill(text)
  await scope.getByRole('button', { name: 'Post' }).click()
  await expect(scope.getByRole('listitem', { name: /^Comment by/ }).filter({ hasText: text })).toBeVisible()
}
const toggle = (scope: Locator) => scope.getByRole('button', { name: /^💬 Comments/ })
const openWishlist = (page: Page) => page.getByRole('tab', { name: 'Wishlist' }).click()

test.beforeEach(cleanup)
test.afterAll(cleanup)

test('comments on a wish, an activity and a to-do; collapsed with a count', async ({ page }) => {
  await seed()
  await login(page)

  await openWishlist(page)
  const wish = page.getByRole('listitem', { name: `${PREFIX}Wish` })
  await expect(toggle(wish)).toHaveText('💬 Comments (0)')
  await post(wish, 'Me too! https://example.com/x')
  await expect(wish.getByRole('link', { name: 'https://example.com/x' })).toBeVisible()

  await page.getByRole('tab', { name: /To do/ }).click()
  const task = page.getByRole('listitem', { name: `${PREFIX}Task` })
  await post(task, 'I can do this one')

  await page.getByRole('tab', { name: 'Route' }).click()
  await page.getByRole('button', { name: `${PREFIX}Talk`, exact: true }).click()
  await page.getByRole('tab', { name: /^Activities/ }).click()
  const activity = page.getByRole('article', { name: `${PREFIX}Activity` })
  await post(activity, 'Book early?')

  await page.reload()
  await openWishlist(page)
  await expect(toggle(page.getByRole('listitem', { name: `${PREFIX}Wish` }))).toHaveText('💬 Comments (1)')
  await expect(page.getByLabel('Add a comment')).toHaveCount(0) // collapsed after reload
})

test('own comments can be edited; the other person’s cannot be changed, not even via the API', async ({ page }) => {
  const { client, t, wish } = await seed()
  const cyn = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  await cyn.auth.signInWithPassword({ email: 'cynthia@china-trip.invalid', password: 'local-e2e-only-password' })
  const { data: theirs } = await cyn.from('comments').insert({ trip_id: t, wishlist_item_id: wish.id, body: 'From Cynthia' }).select().single()

  const del = await client.from('comments').delete().eq('id', theirs!.id).select()
  expect(del.data ?? []).toEqual([])
  const upd = await client.from('comments').update({ body: 'hacked' }).eq('id', theirs!.id).select()
  expect(upd.data ?? []).toEqual([])

  await login(page)
  await openWishlist(page)
  const item = page.getByRole('listitem', { name: `${PREFIX}Wish` })
  await post(item, 'Mine')
  const their = item.getByRole('listitem', { name: /^Comment by Cynthia/ })
  await expect(their).toContainText('From Cynthia')
  await expect(their.getByRole('button', { name: 'Delete' })).toHaveCount(0)

  const mine = item.getByRole('listitem', { name: /^Comment by/ }).filter({ hasText: 'Mine' })
  await mine.getByRole('button', { name: 'Edit' }).click()
  await mine.getByLabel('Edit comment').fill('Mine, edited')
  await mine.getByRole('button', { name: 'Save' }).click()
  await expect(item.getByRole('listitem', { name: /^Comment by/ }).filter({ hasText: 'Mine, edited' })).toContainText('(edited)')
})

test('deleting an item removes its comments', async () => {
  const { client, t, task } = await seed()
  await client.from('comments').insert({ trip_id: t, task_id: task.id, body: 'bye' })
  await client.from('tasks').delete().eq('id', task.id)
  const { data } = await client.from('comments').select('id').eq('task_id', task.id)
  expect(data).toEqual([])
})

import { expect, test } from '@playwright/test'
import { CLAUDE, login } from './helpers'

test('a wrong password is refused', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Email').fill(CLAUDE.email)
  await page.getByLabel('Password').fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password')
})

test('signing in shows the trip and survives a reload', async ({ page }) => {
  await login(page)
  await page.reload()
  await expect(page.locator('.topbar')).toContainText('China 2027')
})

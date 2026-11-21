import { expect, test } from 'vitest'
import { timeAgo } from './timeAgo'

const NOW = new Date('2026-11-21T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const MIN = 60_000

test('recent times read as minutes, hours or days ago', () => {
  expect(timeAgo(ago(20_000), NOW)).toBe('just now')
  expect(timeAgo(ago(5 * MIN), NOW)).toBe('5 min ago')
  expect(timeAgo(ago(59 * MIN), NOW)).toBe('59 min ago')
  expect(timeAgo(ago(2 * 60 * MIN), NOW)).toBe('2 h ago')
  expect(timeAgo(ago(3 * 24 * 60 * MIN), NOW)).toBe('3 d ago')
})

test('a week or more shows the date', () => {
  expect(timeAgo('2026-04-17T10:00:00Z', NOW)).toBe('17 Apr')
})

test('a clock slightly ahead never shows a negative time', () => {
  expect(timeAgo(new Date(NOW.getTime() + 30_000).toISOString(), NOW)).toBe('just now')
})
